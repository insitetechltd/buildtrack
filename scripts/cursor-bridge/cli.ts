#!/usr/bin/env node
/**
 * One-shot CLI: send a single prompt to local Cursor via ACP.
 *
 * Usage:
 *   npm run cursor-bridge:prompt -- "Read documentation/NOW.md and summarize"
 *   npm run cursor-bridge:prompt -- --mode ask "What is taskStore.supabase.ts?"
 */
import { loadConfig, assertAgentAvailable } from './config';
import { runOneShotPrompt } from './acp-client';
import type { BridgeMode } from './types';

function parseArgs(argv: string[]): { text: string; mode: BridgeMode } {
  let mode: BridgeMode = 'agent';
  const parts: string[] = [];

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--mode' && argv[i + 1]) {
      mode = argv[++i] as BridgeMode;
      continue;
    }
    if (arg === '--help' || arg === '-h') {
      console.log(`Usage: cursor-bridge:prompt [--mode agent|plan|ask] "your prompt"

Examples:
  npm run cursor-bridge:prompt -- "Run npm run dev:doctor and report results"
  npm run cursor-bridge:prompt -- --mode ask "Explain src/state/taskStore.supabase.ts"

Requires: Cursor CLI (agent) installed and authenticated (agent login)`);
      process.exit(0);
    }
    parts.push(arg);
  }

  const text = parts.join(' ').trim();
  if (!text) {
    console.error('Error: prompt text is required');
    process.exit(1);
  }
  return { text, mode };
}

async function main(): Promise<void> {
  const { text, mode } = parseArgs(process.argv.slice(2));
  const config = loadConfig();
  assertAgentAvailable(config.agentCommand);

  console.error(`[cursor-bridge] mode=${mode} cwd=${config.cwd}`);
  console.error('[cursor-bridge] streaming response:\n');

  const result = await runOneShotPrompt(config, text, mode);
  console.error(`\n\n[cursor-bridge] stopReason=${result.stopReason ?? 'unknown'}`);
}

main().catch((err) => {
  console.error('[cursor-bridge] fatal:', err.message);
  process.exit(1);
});
