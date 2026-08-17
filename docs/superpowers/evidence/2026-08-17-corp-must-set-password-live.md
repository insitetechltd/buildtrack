# Corp RC — `must_set_password` live apply (2026-08-17)

## Human Gate

- Operator: **GO** + Dashboard apply of
  `supabase/migrations/20260817000600_corp_must_set_password.sql`
- Post-apply service-role probe (no ids/emails):

| Check | Result |
|-------|--------|
| `users.must_set_password` SELECT | **HTTP 206** (column exists) |
| Rows `true` | **0** |
| Rows `false` | **33/33** (default; Create Company / existing seats ungated) |

## Still required

None for this slice. Operator confirmed **new Invite smoke PASS** (2026-08-17): link → Set password → app → logout → email+password.

No secrets or project refs in this file.
