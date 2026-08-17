# Corp RC — deploy `invite-user` Edge Function (Human Gate)

## What

`supabase/functions/invite-user` creates Auth + profile rows for a company seat and returns a one-time temp password. Service role stays on the server.

## Live status (2026-08-17)

| Check | Result |
|-------|--------|
| Deploy | **Dashboard Via Editor** (operator) |
| `POST /functions/v1/invite-user` (anon Bearer) | **401** `INVALID_CREDENTIALS` — **not 404** (function present; gateway JWT check) |
| `create_company_for_self` RPC | **Live** (sibling evidence) |

## Deploy (done)

Operator pasted repo `supabase/functions/invite-user/index.ts` into Dashboard → Edge Functions → Deploy new → Via Editor → name `invite-user`.

CLI alternative (optional later): `bash scripts/supabase/deploy-invite-user.sh` after `supabase login`.

## Verify in app

1. Sign in as company admin.
2. User Management → Invite → worker → confirm temp password shown once.
3. Sign out; sign in as invitee with that password.

No secrets or project refs in this file.
