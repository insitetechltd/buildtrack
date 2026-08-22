# Owner Console — Users & companies module

**Date:** 2026-08-22  
**Milestone:** `WS-OPS / M-OPS-01` (Owner Console harness)  
**Parent:** Owner Console → **Tenant operations** (§3b) — seat/tenant ops, not Henry’s mobile User Management  
**Status:** Planned (module slot on harness; no live writes yet)

## Purpose

Platform-owner tool to **provision and retire company seats** when billing/entitlements are not yet automated. Used for manual create, delete/deactivate, and **initial** company binding — not day-to-day company-admin invite (that stays `UserManagementScreen` + future `M-WEB-01`).

## Audience

- **In:** allowlisted platform superuser (Owner Console)
- **Out:** company admins (Henry), project admins, field users

## Product law (locked)

1. **Company binding is set at user creation only.** `users.company_id` is chosen when the account is created.
2. **No company switch for existing users.** Project/task/photo data belongs to the **company tenant**, not the person. The UI must **not** expose “move user to another company” or edit `company_id` on an existing row.
3. **Wrong company on an existing user:** deactivate/remove seat access; if they need access under another tenant, **create a new user** under that company (new auth identity). Do not migrate historical rows across companies in v1.
4. **Delete/deactivate** removes login/seat; it does not reassign ownership of company data to another tenant.
5. **Entitlement coupling (later):** create user checks company plan seat caps (Growth/Unlimited paper → DB tiers + Stripe). Until entitlements land, owner ops are manual with audit log.

## v1 actions (when built)

| Action | Allowed | Notes |
|---|---|---|
| Create user under company X | Yes | Email, name, role, `company_id` required; Human Gate if service-role write |
| Deactivate / delete seat | Yes | Confirm; preserve audit trail |
| Change `company_id` on existing user | **No** | Hard product block |
| Bulk import | Later | CSV under owner console, same bind-at-create rule |

## Distinct from

| Surface | Who | Scope |
|---|---|---|
| Mobile `UserManagementScreen` | Company admin | Invite/manage **their** company roster |
| `M-WEB-01` `/a/users` | Company admin | Web parity |
| `M-AUTHZ-02` project invite | Partner liaison | Guest on **their** company seats on a project |
| **This module** | Platform owner | Cross-tenant provisioning + entitlement tie-in |

## Implementation phases

### Phase A (current)

- Module card on `OwnerConsoleScreen` under **Tenant operations** — **Later**
- IA: `2026-08-22-owner-console-modules-complete.md` §3b
- Harness shape: `2026-08-19-workflow-gaps-bin.md`

### Phase B (Human Gate before live writes)

- Service-role or `platform_superuser` RLS path for owner create/deactivate
- Forms: company picker (search), user fields, role; **no** company dropdown on edit for existing ids
- Audit log entries for every owner mutation
- Wire seat checks to entitlements module when `M-BILL`/tier tables exist

### Phase C

- Stripe webhook → entitlements → gate create user when seats exhausted
- Read-only cross-tenant user search for support

## Validation

- Owner can create user with company binding
- Edit existing user: company field absent or read-only
- Attempt to PATCH `company_id` via API rejected (server + UI)
- Henry Admin UI unchanged — no cross-company list

## References

- `documentation/role-permission-matrix.md`
- `documentation/multi-company-project-membership.md` (project guest ≠ company switch)
- `src/billing/orgPlans.ts` (R6 SKUs)
- `docs/superpowers/plans/2026-08-19-workflow-gaps-bin.md`
