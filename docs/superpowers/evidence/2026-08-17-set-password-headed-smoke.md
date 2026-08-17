# SetPasswordScreen headed Gate C (2026-08-17)

Maestro flow: `.dbg/set-password-headed-smoke.yaml`  
Device: iPhone 17 Pro sim `702680D5-…` iOS 26.0  
Elapsed ~21s (short flow; 4/4 named PNGs). rc=0 **and** PNGs read.

Forced the screen only for this run (`smokeSetPassword = true`), then **reverted**. Submit alert **Not signed in** is expected (no session).

| Shot | File | What it proves |
|------|------|----------------|
| 01 land | `.dbg/set-password-headed-01-land.png` | Title/subtitle; new + confirm; **no** current-password; Continue |
| 02 focused | `.dbg/set-password-headed-02-password-focused.png` | Tap **field chrome** (`…--field__input-container`) focuses New password (blue border) |
| 03 confirm | `.dbg/set-password-headed-03-keyboard-open.png` | Confirm chrome tap after typing (secure entry) |
| 04 submit | `.dbg/set-password-headed-04-submit.png` | Continue reachable; `completeFirstLoginPassword` ran (`Could not save password` / `Not signed in`) |

Validate() passed (matching ≥6 chars) — empty fields would show inline errors, not that Alert.

Live invitee path (SQL + new Invite → logout → email+password) still Human GO.
