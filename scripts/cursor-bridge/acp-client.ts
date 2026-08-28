import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import readline from 'node:readline';
import { EventEmitter } from 'node:events';
import type {
  BridgeConfig,
  BridgeMode,
  JobChunk,
  JsonRpcRequest,
  JsonRpcResponse,
  PermissionDecision,
} from './types';

export interface PromptResult {
  stopReason?: string;
  output: string;
}

export interface AcpClientOptions {
  config: BridgeConfig;
  onChunk?: (chunk: JobChunk) => void;
}

/**
 * Minimal ACP (Agent Client Protocol) client for Cursor CLI.
 * Spawns `agent acp` and speaks newline-delimited JSON-RPC over stdio.
 * @see https://cursor.com/docs/cli/acp
 */
export class AcpClient extends EventEmitter {
  private agent?: ChildProcessWithoutNullStreams;
  private rl?: readline.Interface;
  private nextId = 1;
  private pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();
  private sessionId?: string;
  private output = '';
  private readonly config: BridgeConfig;
  private readonly onChunk?: (chunk: JobChunk) => void;

  constructor(options: AcpClientOptions) {
    super();
    this.config = options.config;
    this.onChunk = options.onChunk;
  }

  get currentSessionId(): string | undefined {
    return this.sessionId;
  }

  async start(): Promise<void> {
    if (this.agent) return;

    const env = { ...process.env };
    if (process.env.CURSOR_API_KEY) {
      env.CURSOR_API_KEY = process.env.CURSOR_API_KEY;
    }

    this.agent = spawn(this.config.agentCommand, this.config.agentArgs, {
      cwd: this.config.cwd,
      stdio: ['pipe', 'pipe', 'pipe'],
      env,
    });

    this.agent.stderr.on('data', (buf: Buffer) => {
      const line = buf.toString().trim();
      if (line) this.emit('log', line);
    });

    this.rl = readline.createInterface({ input: this.agent.stdout });
    this.rl.on('line', (line) => this.handleLine(line));

    this.agent.on('exit', (code) => {
      this.emit('exit', code);
      this.agent = undefined;
    });

    await this.send('initialize', {
      protocolVersion: 1,
      clientCapabilities: {
        fs: { readTextFile: false, writeTextFile: false },
        terminal: false,
      },
      clientInfo: { name: 'insite-cursor-bridge', version: '0.1.0' },
    });

    await this.send('authenticate', { methodId: 'cursor_login' });
  }

  async createSession(cwd: string, mode: BridgeMode = 'agent'): Promise<string> {
    await this.start();
    const result = (await this.send('session/new', {
      cwd,
      mode,
      mcpServers: [],
    })) as { sessionId?: string };
    if (!result.sessionId) {
      throw new Error('session/new did not return sessionId');
    }
    this.sessionId = result.sessionId;
    return result.sessionId;
  }

  async loadSession(sessionId: string): Promise<void> {
    await this.start();
    await this.send('session/load', { sessionId });
    this.sessionId = sessionId;
  }

  async prompt(text: string, sessionId?: string): Promise<PromptResult> {
    const sid = sessionId ?? this.sessionId;
    if (!sid) {
      throw new Error('No active session — call createSession first');
    }

    this.output = '';
    const result = (await this.send('session/prompt', {
      sessionId: sid,
      prompt: [{ type: 'text', text }],
    })) as { stopReason?: string };

    return { stopReason: result.stopReason, output: this.output };
  }

  async cancel(sessionId?: string): Promise<void> {
    const sid = sessionId ?? this.sessionId;
    if (!sid) return;
    await this.send('session/cancel', { sessionId: sid });
  }

  async shutdown(): Promise<void> {
    this.rl?.close();
    if (this.agent && !this.agent.killed) {
      this.agent.stdin.end();
      this.agent.kill();
    }
    this.agent = undefined;
    this.sessionId = undefined;
  }

  private pushChunk(chunk: JobChunk): void {
    this.onChunk?.(chunk);
    this.emit('chunk', chunk);
  }

  private handleLine(line: string): void {
    let msg: JsonRpcResponse;
    try {
      msg = JSON.parse(line) as JsonRpcResponse;
    } catch {
      this.emit('log', line);
      return;
    }

    if (msg.id != null && (msg.result != null || msg.error != null)) {
      const waiter = this.pending.get(msg.id);
      if (!waiter) return;
      this.pending.delete(msg.id);
      if (msg.error) {
        waiter.reject(new Error(msg.error.message));
      } else {
        waiter.resolve(msg.result);
      }
      return;
    }

    if (msg.method === 'session/update') {
      this.handleSessionUpdate(msg.params ?? {});
      return;
    }

    if (msg.method === 'session/request_permission' && msg.id != null) {
      this.respondPermission(msg.id, msg.params ?? {});
      return;
    }

    if (msg.method === 'cursor/ask_question' && msg.id != null) {
      this.respondAskQuestion(msg.id);
      return;
    }

    if (msg.method === 'cursor/create_plan' && msg.id != null) {
      this.respondCreatePlan(msg.id);
      return;
    }

    if (msg.method === 'cursor/update_todos') {
      this.pushChunk({
        type: 'todo',
        data: msg.params,
        at: new Date().toISOString(),
      });
      return;
    }

    if (msg.method === 'cursor/task') {
      this.pushChunk({
        type: 'task',
        data: msg.params,
        at: new Date().toISOString(),
      });
      return;
    }
  }

  private handleSessionUpdate(params: Record<string, unknown>): void {
    const update = params.update as Record<string, unknown> | undefined;
    if (!update) return;

    if (update.sessionUpdate === 'agent_message_chunk') {
      const content = update.content as { text?: string } | undefined;
      const text = content?.text ?? '';
      if (text) {
        this.output += text;
        this.pushChunk({ type: 'text', text, at: new Date().toISOString() });
      }
    }
  }

  private respondPermission(id: number, params: Record<string, unknown>): void {
    const decision = this.config.permissionDefault;
    this.pushChunk({
      type: 'permission',
      data: { params, decision },
      at: new Date().toISOString(),
    });
    this.write({
      jsonrpc: '2.0',
      id,
      result: { outcome: { outcome: 'selected', optionId: decision } },
    });
  }

  private respondAskQuestion(id: number): void {
    const outcome =
      this.config.askQuestionDefault === 'cancelled'
        ? { outcome: 'cancelled' as const }
        : { outcome: 'skipped' as const, reason: 'auto-skipped by cursor-bridge' };
    this.write({ jsonrpc: '2.0', id, result: { outcome } });
  }

  private respondCreatePlan(id: number): void {
    const outcome =
      this.config.createPlanDefault === 'rejected'
        ? { outcome: 'rejected' as const, reason: 'auto-rejected by cursor-bridge' }
        : { outcome: 'accepted' as const };
    this.write({ jsonrpc: '2.0', id, result: { outcome } });
  }

  private write(payload: JsonRpcRequest | JsonRpcResponse): void {
    if (!this.agent?.stdin.writable) {
      throw new Error('ACP agent stdin is not writable');
    }
    this.agent.stdin.write(`${JSON.stringify(payload)}\n`);
  }

  private send(method: string, params: Record<string, unknown>): Promise<unknown> {
    return new Promise((resolve, reject) => {
      if (!this.agent) {
        reject(new Error('ACP agent is not running'));
        return;
      }
      const id = this.nextId++;
      this.pending.set(id, { resolve, reject });
      this.write({ jsonrpc: '2.0', id, method, params });
    });
  }
}

export async function runOneShotPrompt(
  config: BridgeConfig,
  text: string,
  mode: BridgeMode = 'agent',
): Promise<PromptResult> {
  const client = new AcpClient({
    config,
    onChunk: (chunk) => {
      if (chunk.type === 'text' && chunk.text) {
        process.stdout.write(chunk.text);
      }
    },
  });

  try {
    await client.createSession(config.cwd, mode);
    return await client.prompt(text);
  } finally {
    await client.shutdown();
  }
}
