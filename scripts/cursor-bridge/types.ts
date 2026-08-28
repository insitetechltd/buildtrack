export type BridgeMode = 'agent' | 'plan' | 'ask';

export type PermissionDecision = 'allow-once' | 'allow-always' | 'reject-once';

export type JobStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface BridgeConfig {
  port: number;
  host: string;
  token?: string;
  agentCommand: string;
  agentArgs: string[];
  cwd: string;
  permissionDefault: PermissionDecision;
  askQuestionDefault: 'skipped' | 'cancelled';
  createPlanDefault: 'accepted' | 'rejected';
  bindLocalhostOnly: boolean;
}

export interface PromptRequest {
  text: string;
  sessionId?: string;
  mode?: BridgeMode;
  cwd?: string;
}

export interface SessionInfo {
  sessionId: string;
  cwd: string;
  mode: BridgeMode;
  createdAt: string;
}

export interface JobChunk {
  type: 'text' | 'todo' | 'task' | 'permission' | 'status' | 'error';
  text?: string;
  data?: unknown;
  at: string;
}

export interface JobRecord {
  id: string;
  status: JobStatus;
  prompt: string;
  sessionId: string;
  mode: BridgeMode;
  cwd: string;
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
  stopReason?: string;
  output: string;
  chunks: JobChunk[];
  error?: string;
}

export interface JsonRpcRequest {
  jsonrpc: '2.0';
  id?: number;
  method: string;
  params?: Record<string, unknown>;
}

export interface JsonRpcResponse {
  jsonrpc: '2.0';
  id?: number;
  result?: Record<string, unknown>;
  error?: { code: number; message: string; data?: unknown };
  method?: string;
  params?: Record<string, unknown>;
}
