# ASC listing — Taskr 1.1.3 (Fastlane Deliver)

**Updated:** 2026-09-29 (ENV-01 Phase D Closed; awaiting Apple clearance)  
**App:** `6754898737` · https://appstoreconnect.apple.com/apps/6754898737  
**Bundle:** `com.buildtrack.app.local`  
**Copy SoT:** [`documentation/MARKETING.md`](../../../documentation/MARKETING.md)  
**Paste pack (human-readable):** [`2026-09-25-asc-paste-pack-279.md`](../evidence/2026-09-25-asc-paste-pack-279.md)  
**Deliver metadata:** `fastlane/metadata/{en-US,zh-Hant}/` · notes `fastlane/review_information/notes.txt`  
**Screenshots:** `docs/taskr/assets/store/{iphone-67,ipad-13}/`

**Current status:** Build **280** is **REJECTED / UNRESOLVED_ISSUES** (Guideline 2.1). Resolution Center reply sent by Tristan after demo password reset. Awaiting Apple clearance.

Seller name stays **Tri Stan Ching KOO**. Do **not** convert to Insite Works Limited mid-review (GTM Gate 2 OPEN).  
**Public** stays unticked unless you explicitly enable store visibility in ASC.

---

## Automation (preferred)

```bash
# Metadata + screenshots + attach build (default ASC_BUILD_NUMBER=280)
ASC_BUILD_NUMBER=280 npm run asc:paste

# After you finish ASC completeness review:
ASC_SUBMIT=1 npm run asc:submit
```

Auth: ASC API key **57D87U9MQ2** (App Manager) from `eas.json` + local `.p8`.  
Historical “API can read / PATCH 403” is obsolete for this key+role — retry with Deliver.

CBP: bare **CBP** = commit → local build → S4 → EAS TF upload.  
**CBP+ASC** / `ASC_DELIVER=1` also runs `asc:paste`.  
**CBP+submit** / `ASC_SUBMIT=1` also runs `asc:submit`. See `.cursor/rules/cbp-commit-build-push-tf.mdc`.

---

## Live ASC state

| Item | State |
|---|---|
| Build attached | **280** (Taskr 1.1.3) |
| Screenshots | Regenerated 2026-09-26 (Option A Activity); uploaded with 280 paste |
| Review status | **REJECTED / UNRESOLVED_ISSUES** (Guideline 2.1 - demo credentials) |
| Resolution | Reply sent by Tristan after demo password reset; awaiting Apple clearance |
| Public listing | **Off** (do not enable) |

---

## Manual fallback (web UI)

Use the paste pack only if Deliver fails. Same fields: App Information URLs, EN + zh-Hant metadata, review notes, build **280**, Public unticked.
