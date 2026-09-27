# ASC listing — Taskr 1.1.3 (Fastlane Deliver)

**Updated:** 2026-09-27 (automated paste via Fastlane; CBP may chain ASC)  
**App:** `6754898737` · https://appstoreconnect.apple.com/apps/6754898737  
**Bundle:** `com.buildtrack.app.local`  
**Copy SoT:** [`documentation/MARKETING.md`](../../../documentation/MARKETING.md)  
**Paste pack (human-readable):** [`2026-09-25-asc-paste-pack-279.md`](../evidence/2026-09-25-asc-paste-pack-279.md)  
**Deliver metadata:** `fastlane/metadata/{en-US,zh-Hant}/` · notes `fastlane/review_information/notes.txt`  
**Screenshots:** `docs/taskr/assets/store/{iphone-67,ipad-13}/`

Seller name stays **Tri Stan Ching KOO**. Do **not** convert to Insite Works Limited mid-review (GTM Gate 2 OPEN).  
**Public** stays unticked unless you explicitly enable store visibility in ASC.

---

## Automation (preferred)

```bash
# Metadata + screenshots + attach build (default ASC_BUILD_NUMBER=279)
npm run asc:paste

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
| Build to attach | Prefer **279** only |
| Screenshots SoT | Regenerated 2026-09-26 (Option A Activity) |
| Human | One-time ASC completeness review, then `ASC_SUBMIT=1 npm run asc:submit` |

---

## Manual fallback (web UI)

Use the paste pack only if Deliver fails. Same fields: App Information URLs, EN + zh-Hant metadata, review notes, build **279**, Public unticked.
