# Cursor Local Bridge

Command your **local desktop Cursor agent** remotely — from your phone, a cloud agent, a cron job, or `curl`.

This bridge wraps the official [Cursor CLI ACP protocol](https://cursor.com/docs/cli/acp). It spawns `agent acp` on your Mac, forwards prompts, streams responses, and auto-handles tool-permission prompts so headless use does not block.

## What this is (and is not)

| Approach | Use when |
|----------|----------|
| **This bridge (`cursor-bridge`)** | You want a **programmatic API** to send commands to the local Cursor agent engine |
| **[Remote Control](https://cursor.com/docs)** (`/remote-control` in desktop) | You want to **steer an open desktop session** from Cursor mobile/web (human UX) |
| **[Cloud Agents API](https://cursor.com/docs/cloud-agent/api)** | Your Mac is off; work runs in Cursor's cloud VM instead |

There is no official API to inject messages into an arbitrary open Composer tab. This bridge talks to the **same agent engine** via CLI ACP — with your repo's `.cursor/rules`, hooks, and MCP config.

## Prerequisites

1. **Cursor CLI** on your Mac:

   ```bash
   curl https://cursor.com/install -fsSL | bash
   agent login   # or set CURSOR_API_KEY
   ```

2. **Node + npm** (already in this repo).

3. Optional: copy config template:

   ```bash
   cp .cursor/bridge.json.example .cursor/bridge.json
   ```

## Quick start

### One-shot prompt (CLI)

```bash
npm run cursor-bridge:prompt -- "Read documentation/NOW.md and tell me what's in progress"

# Read-only Q&A mode
npm run cursor-bridge:prompt -- --mode ask "What does taskStore.supabase.ts do?"
```

### Daemon (HTTP API)

Terminal 1 — start the bridge on your Mac (localhost only by default):

```bash
export CURSOR_BRIDGE_TOKEN="pick-a-long-random-string"
npm run cursor-bridge:start
```

Terminal 2 — send a command:

```bash
curl -s -X POST http://127.0.0.1:9477/api/v1/prompt \
  -H "Authorization: Bearer $CURSOR_BRIDGE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"text":"Run npm run dev:doctor and report pass/fail"}' | jq
```

Stream output (SSE):

```bash
JOB_ID="<from POST response>"
curl -N "http://127.0.0.1:9477/api/v1/jobs/$JOB_ID/stream" \
  -H "Authorization: Bearer $CURSOR_BRIDGE_TOKEN"
```

Poll job status:

```bash
curl -s "http://127.0.0.1:9477/api/v1/jobs/$JOB_ID" \
  -H "Authorization: Bearer $CURSOR_BRIDGE_TOKEN" | jq
```

## HTTP API

| Method | Path | Body | Description |
|--------|------|------|-------------|
| `GET` | `/health` | — | Liveness (no auth if token unset) |
| `POST` | `/api/v1/session/new` | `{ cwd?, mode? }` | Create ACP session |
| `GET` | `/api/v1/sessions` | — | List sessions |
| `POST` | `/api/v1/prompt` | `{ text, sessionId?, mode?, cwd? }` | Queue a prompt → `{ jobId }` |
| `GET` | `/api/v1/jobs/:id` | — | Job status + full output |
| `GET` | `/api/v1/jobs/:id/stream` | — | SSE stream of chunks |

**Modes:** `agent` (full tools), `plan` (read-only planning), `ask` (Q&A).

**Auth:** When `CURSOR_BRIDGE_TOKEN` is set, pass `Authorization: Bearer <token>`.

## Configuration

Environment variables override `.cursor/bridge.json`:

| Variable | Default | Description |
|----------|---------|-------------|
| `CURSOR_BRIDGE_PORT` | `9477` | HTTP port |
| `CURSOR_BRIDGE_TOKEN` | — | Bearer token (strongly recommended) |
| `CURSOR_BRIDGE_HOST` | `127.0.0.1` | Bind address |
| `CURSOR_BRIDGE_BIND_ALL` | — | Set `1` to listen on all interfaces (use with tunnel + token) |
| `CURSOR_BRIDGE_PERMISSION` | `allow-once` | Tool approval: `allow-once`, `allow-always`, `reject-once` |
| `CURSOR_BRIDGE_AGENT_CMD` | `agent` | Path to Cursor CLI binary |
| `CURSOR_API_KEY` | — | Passed through to `agent acp` |

See `.cursor/bridge.json.example` for file-based config.

## Remote access patterns

### A. Tailscale / SSH tunnel (recommended)

Keep the bridge on localhost; tunnel from your phone or cloud VM:

```bash
# From remote machine with SSH to your Mac
ssh -N -L 9477:127.0.0.1:9477 your-mac
```

Then `curl` against `http://127.0.0.1:9477` on the remote side.

### B. Cursor Remote Control (no code)

For human steering of an **existing desktop session**:

1. Dashboard → Cloud Agents → Enable **Remote Control**
2. In desktop Agents: `/remote-control` on the session
3. Continue from Cursor mobile or [cursor.com/agents](https://cursor.com/agents)

Tool calls still run on your Mac; this is UI handoff, not HTTP.

### C. Cloud Agent → local bridge

A cloud agent cannot reach your Mac directly. Use a tunnel (A) or have the cloud agent write commands to a synced queue (e.g. git branch, shared file) that a local watcher consumes — extend `server.ts` if you need that pattern.

## Insite integration tips

- Session continuity: the bridge uses the same repo root; your `sessionStart` hook still injects `documentation/NOW.md`.
- Maestro sim locks: set `CURSOR_AGENT_ID` when spawning bridge jobs so `scripts/maestro/sim-lock.sh` ownership stays consistent.
- Danger gates still apply: the bridge auto-approves tool calls per `permissionDefault`. Use `reject-once` or run in `--mode ask` for read-only inspection.

## npm scripts

```bash
npm run cursor-bridge:start          # HTTP daemon
npm run cursor-bridge:prompt -- "…"  # One-shot CLI
```

## Architecture

```
Remote client (curl, phone bot, cron)
        │
        ▼
  cursor-bridge HTTP :9477
        │
        ▼
  agent acp  (stdio JSON-RPC)
        │
        ▼
  Local Cursor agent engine
  (rules, hooks, MCP, tools on your Mac)
```

Implementation: `scripts/cursor-bridge/`.

## Security

- **Always set `CURSOR_BRIDGE_TOKEN`** if the port is reachable beyond localhost.
- Default bind is `127.0.0.1` only.
- The bridge can run shell commands and edit files via the agent — treat the token like a root password.
- Never commit tokens; use env vars only.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `agent not found` | Install CLI: `curl https://cursor.com/install -fsSL \| bash` |
| Auth errors | Run `agent login` or export `CURSOR_API_KEY` |
| Jobs hang on permissions | Set `CURSOR_BRIDGE_PERMISSION=allow-once` (default) |
| Empty responses | Check `agent acp` works standalone; verify `cwd` is repo root |

## Related docs

- [Cursor CLI ACP](https://cursor.com/docs/cli/acp)
- [CURSOR_DEV_HARNESS.md](./CURSOR_DEV_HARNESS.md) — Insite delivery harness
- [Remote Control](https://cursor.com/docs) — official mobile/desktop handoff
