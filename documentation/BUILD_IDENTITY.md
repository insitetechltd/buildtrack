# Build identity (shared iOS + Android)

## Store IDs (numeric only)

| Field | Where | Rule |
|-------|--------|------|
| Marketing version | `app.json` → `expo.version` | e.g. `1.1.3` |
| Shared build `N` | `expo.ios.buildNumber` **and** `expo.android.versionCode` | Same integer on both platforms |
| EAS | `eas.json` → `cli.appVersionSource: local` | Binary reads `app.json`; script owns bumps |

Apple `CFBundleVersion` and Google `versionCode` must stay digits only. Do **not** put `248i` into store fields.

## Login badge (display)

Format:

```text
v{marketingVersion} ({N}{platform}-{purpose})
```

Examples:

- Internal TF iOS: `v1.1.3 (248i-tf)`
- Production Android: `v1.1.3 (248a-rc)`
- Simulator: `v1.1.3 (248i-sim)`
- Metro: `v1.1.3 (0i-dev)` (or native build if present)

| Token | Values | Source |
|-------|--------|--------|
| platform | `i` / `a` | `Platform.OS` at runtime |
| purpose | `tf` / `rc` / `sim` / `dev` | `EXPO_PUBLIC_BUILD_CHANNEL` baked by EAS profile |

Profile → channel ([`eas.json`](../eas.json)):

- `dev` / `preview` → `tf`
- `production` → `rc`
- `simulator` → `sim`
- Metro / missing → `dev`

Code: [`src/utils/buildIdentity.ts`](../src/utils/buildIdentity.ts) · login wire: [`src/ui/viewAdapters/useLoginViewAdapter.ts`](../src/ui/viewAdapters/useLoginViewAdapter.ts)

## Bump shared `N`

```bash
# Next build (default): max(local ios, local android, local IPA artifacts) + 1
bash scripts/sync-shared-build-number.sh

# Align both platforms to current max without +1
bash scripts/sync-shared-build-number.sh --no-bump

# Force a value (use once after cutover if artifacts are missing)
bash scripts/sync-shared-build-number.sh --set 249

# Preview only
bash scripts/sync-shared-build-number.sh --dry-run
```

[`build-local.sh`](../build-local.sh) runs the sync before `eas build` (pass third arg `true` for `--no-bump`). Submit footers print the display label, not a stale bare integer alone.

**Note:** First Android sync after this scheme may jump `versionCode` from a low Play value (e.g. 41) up to the shared iOS sequence (e.g. 248+). That is intentional so both tracks share one counter.
