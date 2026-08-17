# R5 — ASC submit evidence (2026-08-17)

## Upload

- **IPA:** `.eas/artifacts/build-1786960197637.ipa`
- **Version:** 1.1.3
- **Build:** 181 (remote)
- **Bundle ID:** `com.buildtrack.app.local`
- **ASC App:** Insite Trackr (`6754898737`)

## EAS

```
npx eas submit --platform ios \
  --path .eas/artifacts/build-1786960197637.ipa \
  --profile production --non-interactive
```

- Submission ID: `5d736f76-0749-4b27-bad5-329231d3ae4b`
- URL: https://expo.dev/accounts/insitetech/projects/buildtrack/submissions/5d736f76-0749-4b27-bad5-329231d3ae4b
- Result: **Submitted your app to Apple App Store Connect!**

## Human next steps

1. Wait for Apple processing email (~5–10 min)
2. ASC → TestFlight → confirm build **181** appears
3. Attach to version / add testers — **do not** tick Public unless shipping live

## Processing poll

See `docs/superpowers/evidence/2026-08-17-r5-asc-processing.md` (overnight A9).
