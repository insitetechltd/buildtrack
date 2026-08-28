import fs from 'node:fs';
import path from 'node:path';
import type { BridgeConfig, PermissionDecision } from './types';

const DEFAULT_PORT = 9477;

function readProjectConfig(repoRoot: string): Partial<BridgeConfig> {
  const configPath = path.join(repoRoot, '.cursor', 'bridge.json');
  if (!fs.existsSync(configPath)) {
    return {};
  }
  try {
    return JSON.parse(fs.readFileSync(configPath, 'utf8')) as Partial<BridgeConfig>;
  } catch {
    console.warn(`[cursor-bridge] Ignoring invalid ${configPath}`);
    return {};
  }
}

export function loadConfig(cwd = process.cwd()): BridgeConfig {
  const repoRoot = cwd;
  const fileConfig = readProjectConfig(repoRoot);

  const permissionDefault = (process.env.CURSOR_BRIDGE_PERMISSION ??
    fileConfig.permissionDefault ??
    'allow-once') as PermissionDecision;

  return {
    port: Number(process.env.CURSOR_BRIDGE_PORT ?? fileConfig.port ?? DEFAULT_PORT),
    host: process.env.CURSOR_BRIDGE_HOST ?? fileConfig.host ?? '127.0.0.1',
    token: process.env.CURSOR_BRIDGE_TOKEN ?? fileConfig.token,
    agentCommand: process.env.CURSOR_BRIDGE_AGENT_CMD ?? fileConfig.agentCommand ?? 'agent',
    agentArgs: fileConfig.agentArgs ?? ['acp'],
    cwd: repoRoot,
    permissionDefault,
    askQuestionDefault: fileConfig.askQuestionDefault ?? 'skipped',
    createPlanDefault: fileConfig.createPlanDefault ?? 'accepted',
    bindLocalhostOnly:
      process.env.CURSOR_BRIDGE_BIND_ALL !== '1' && fileConfig.bindLocalhostOnly !== false,
  };
}

import { execSync } from 'node:child_process';

export function assertAgentAvailable(command: string): void {
  try {
    execSync(`command -v ${command}`, { stdio: 'ignore' });
  } catch {
    throw new Error(
      `Cursor CLI "${command}" not found. Install: curl https://cursor.com/install -fsSL | bash`,
    );
  }
}
