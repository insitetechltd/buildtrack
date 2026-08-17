# Corp RC — Copy invite + first-login set-password (2026-08-17)

No project refs or secrets.

## Copy invite link (Track A)

| Check | Result |
|-------|--------|
| App: User Management **Copy invite link** | In tree (`copyLink: true`) |
| `invite-open` live | **302** to App Store on iPhone UA (re-probed) |
| `invite_sign_in_link` SQL (`20260817000500`) | **LIVE** (service-role SELECT 206) |
| `invite-user` deploy | **Live** (operator; new Invite smoke PASS) |
| Henry / new Invite smoke | **PASS** — Set password → app → logout → email+password |

Clipboard copy is try/caught. Email lookup on copy/remint uses `ilike`.

## Set-password gate (Track B)

| Check | Result |
|-------|--------|
| Migration file | `supabase/migrations/20260817000600_corp_must_set_password.sql` |
| Live SQL | **LIVE** (`20260817000600`) |
| Edge: flag on **new** create only | In repo; copy/already-exists remint does not set it |
| App gate | `SetPasswordScreen` outside `NavigationContainer`; Realtime unmounted |
| Headed Gate C | Maestro 4 PNGs — see sibling evidence |

## Apply order (do not invert)

1. Human GO → apply `20260817000600` — **done**
2. Redeploy `invite-user` — **done** (operator)
3. Smoke a **new Invite** — **PASS** (2026-08-17)
