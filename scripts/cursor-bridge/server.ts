import http from 'node:http';
import { randomUUID } from 'node:crypto';
import { URL } from 'node:url';
import { AcpClient } from './acp-client';
import { loadConfig, assertAgentAvailable } from './config';
import type {
  BridgeConfig,
  BridgeMode,
  JobRecord,
  PromptRequest,
  SessionInfo,
} from './types';

interface BridgeState {
  config: BridgeConfig;
  client: AcpClient;
  sessions: Map<string, SessionInfo>;
  jobs: Map<string, JobRecord>;
  jobQueue: string[];
  processing: boolean;
}

function json(res: http.ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload),
  });
  res.end(payload);
}

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function authOk(req: http.IncomingMessage, config: BridgeConfig): boolean {
  if (!config.token) return true;
  const header = req.headers.authorization ?? '';
  return header === `Bearer ${config.token}`;
}

function createJob(
  state: BridgeState,
  text: string,
  sessionId: string,
  mode: BridgeMode,
  cwd: string,
): JobRecord {
  const job: JobRecord = {
    id: randomUUID(),
    status: 'queued',
    prompt: text,
    sessionId,
    mode,
    cwd,
    createdAt: new Date().toISOString(),
    output: '',
    chunks: [],
  };
  state.jobs.set(job.id, job);
  state.jobQueue.push(job.id);
  return job;
}

async function ensureSession(
  state: BridgeState,
  sessionId?: string,
  cwd?: string,
  mode: BridgeMode = 'agent',
): Promise<string> {
  if (sessionId && state.sessions.has(sessionId)) {
    return sessionId;
  }

  const workdir = cwd ?? state.config.cwd;
  const sid = await state.client.createSession(workdir, mode);
  state.sessions.set(sid, {
    sessionId: sid,
    cwd: workdir,
    mode,
    createdAt: new Date().toISOString(),
  });
  return sid;
}

async function processQueue(state: BridgeState): Promise<void> {
  if (state.processing) return;
  state.processing = true;

  while (state.jobQueue.length > 0) {
    const jobId = state.jobQueue.shift();
    if (!jobId) break;
    const job = state.jobs.get(jobId);
    if (!job) continue;

    job.status = 'running';
    job.startedAt = new Date().toISOString();
    job.chunks.push({ type: 'status', text: 'running', at: job.startedAt });

    const onChunk = (c: import('./types').JobChunk) => {
      job.chunks.push(c);
      if (c.type === 'text' && c.text) {
        job.output += c.text;
      }
    };
    state.client.on('chunk', onChunk);

    try {
      if (state.client.currentSessionId !== job.sessionId) {
        await state.client.loadSession(job.sessionId);
      }
      const result = await state.client.prompt(job.prompt, job.sessionId);
      job.stopReason = result.stopReason;
      job.status = 'completed';
    } catch (err) {
      job.status = 'failed';
      job.error = err instanceof Error ? err.message : String(err);
      job.chunks.push({
        type: 'error',
        text: job.error,
        at: new Date().toISOString(),
      });
    } finally {
      state.client.off('chunk', onChunk);
      job.finishedAt = new Date().toISOString();
      job.chunks.push({ type: 'status', text: job.status, at: job.finishedAt });
    }
  }

  state.processing = false;
}

async function handleRequest(state: BridgeState, req: http.IncomingMessage, res: http.ServerResponse) {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);

  if (req.method === 'GET' && url.pathname === '/health') {
    return json(res, 200, {
      ok: true,
      sessions: state.sessions.size,
      jobs: state.jobs.size,
      queue: state.jobQueue.length,
      cwd: state.config.cwd,
    });
  }

  if (!authOk(req, state.config)) {
    return json(res, 401, { error: 'Unauthorized — set Authorization: Bearer <CURSOR_BRIDGE_TOKEN>' });
  }

  if (req.method === 'GET' && url.pathname === '/api/v1/sessions') {
    return json(res, 200, { sessions: [...state.sessions.values()] });
  }

  if (req.method === 'POST' && url.pathname === '/api/v1/session/new') {
    const raw = await readBody(req);
    const body = raw ? (JSON.parse(raw) as { cwd?: string; mode?: BridgeMode }) : {};
    const sid = await ensureSession(state, undefined, body.cwd, body.mode ?? 'agent');
    return json(res, 201, { sessionId: sid, session: state.sessions.get(sid) });
  }

  if (req.method === 'POST' && url.pathname === '/api/v1/prompt') {
    const body = JSON.parse(await readBody(req)) as PromptRequest;
    if (!body.text?.trim()) {
      return json(res, 400, { error: 'text is required' });
    }
    const sid = await ensureSession(state, body.sessionId, body.cwd, body.mode ?? 'agent');
    const job = createJob(state, body.text, sid, body.mode ?? 'agent', body.cwd ?? state.config.cwd);
    void processQueue(state);
    return json(res, 202, { jobId: job.id, sessionId: sid, status: job.status });
  }

  const jobMatch = url.pathname.match(/^\/api\/v1\/jobs\/([^/]+)$/);
  if (req.method === 'GET' && jobMatch) {
    const job = state.jobs.get(jobMatch[1]);
    if (!job) return json(res, 404, { error: 'job not found' });
    return json(res, 200, job);
  }

  const streamMatch = url.pathname.match(/^\/api\/v1\/jobs\/([^/]+)\/stream$/);
  if (req.method === 'GET' && streamMatch) {
    const jobId = streamMatch[1];
    const job = state.jobs.get(jobId);
    if (!job) return json(res, 404, { error: 'job not found' });

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });

    let cursor = 0;
    const sendEvents = () => {
      while (cursor < job.chunks.length) {
        const chunk = job.chunks[cursor++];
        res.write(`event: chunk\ndata: ${JSON.stringify(chunk)}\n\n`);
      }
      if (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') {
        res.write(`event: done\ndata: ${JSON.stringify({ status: job.status, stopReason: job.stopReason })}\n\n`);
        clearInterval(timer);
        res.end();
      }
    };

    const timer = setInterval(sendEvents, 250);
    sendEvents();
    req.on('close', () => clearInterval(timer));
    return;
  }

  return json(res, 404, { error: 'not found' });
}

export async function startServer(): Promise<void> {
  const config = loadConfig();
  assertAgentAvailable(config.agentCommand);

  const client = new AcpClient({ config });
  await client.start();

  const state: BridgeState = {
    config,
    client,
    sessions: new Map(),
    jobs: new Map(),
    jobQueue: [],
    processing: false,
  };

  const host = config.bindLocalhostOnly ? '127.0.0.1' : config.host;
  const server = http.createServer((req, res) => {
    handleRequest(state, req, res).catch((err) => {
      json(res, 500, { error: err instanceof Error ? err.message : String(err) });
    });
  });

  server.listen(config.port, host, () => {
    console.log(`[cursor-bridge] listening on http://${host}:${config.port}`);
    console.log(`[cursor-bridge] cwd=${config.cwd}`);
    console.log(`[cursor-bridge] auth=${config.token ? 'token required' : 'open (set CURSOR_BRIDGE_TOKEN)'}`);
    console.log('[cursor-bridge] POST /api/v1/prompt  { "text": "your command" }');
  });

  const shutdown = async () => {
    console.log('\n[cursor-bridge] shutting down…');
    server.close();
    await client.shutdown();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

if (require.main === module) {
  startServer().catch((err) => {
    console.error('[cursor-bridge] fatal:', err.message);
    process.exit(1);
  });
}
