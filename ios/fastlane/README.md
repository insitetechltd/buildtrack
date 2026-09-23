# BuildTrack iOS Fastlane Setup

## Purpose

Minimal Fastlane configuration to fill gaps **not covered by EAS**:

1. **Promote TestFlight → App Store**: Submit an existing TestFlight build to App Store review
2. **Manual IPA Upload**: Upload a pre-built IPA to TestFlight (backup/recovery path)

**Do NOT use Fastlane to replace the existing EAS build pipeline.** Continue using `./build-and-submit.sh` for daily TestFlight builds.

---

## When to Use What

### ✅ Use EAS (existing workflow)

- **Daily TestFlight builds** (DEV backend): `./build-and-submit.sh ios dev`
- **Production builds** (PROD backend + App Store): `./build-and-submit.sh ios production true`
- **Initial TestFlight submission** of a new build

**EAS is the source of truth for building and initial TestFlight submission.**

### ✅ Use Fastlane (new, limited scope)

- **Promote an existing TestFlight build to App Store review** → `bundle exec fastlane promote`
- **Upload a pre-built IPA** (recovery/manual path) → `bundle exec fastlane tf_upload`

---

## Setup

### 1. Install Dependencies

From the repository root:

```bash
cd ios
bundle install
```

This installs Fastlane and its dependencies via Bundler (locked versions in `Gemfile.lock`).

### 2. Configure Environment Variables

Fastlane uses **App Store Connect API keys** for authentication (no interactive Apple ID login required).

**Required environment variables:**

```bash
# App Store Connect API Key (from eas.json or Apple Developer portal)
ASC_KEY_ID=57D87U9MQ2
ASC_ISSUER_ID=169799ef-c185-49f3-8c48-7d82e7ba7683
ASC_KEY_PATH=/path/to/your/AuthKey_57D87U9MQ2.p8

# Optional: Apple ID and Team ID (Fastlane can prompt if not set)
FASTLANE_APPLE_ID=your-apple-id@example.com
FASTLANE_TEAM_ID=YOURTEAMID
```

**Where to set these:**

- **Local development**: Add to `.env` (gitignored) or `~/.zshrc` / `~/.bashrc`
- **CI/CD**: Use your secret manager (GitHub Secrets, etc.)

**⚠️ Never commit `.p8` key files, `AuthKey_*.p8`, or credentials to git.**

### 3. Verify Setup

```bash
cd ios
bundle exec fastlane --version
```

Expected output: `fastlane 2.226.0` (or similar)

---

## Available Lanes

### `promote` — Promote TestFlight Build to App Store Review

Submit an existing TestFlight build for App Store review.

**Usage:**

```bash
cd ios
bundle exec fastlane promote build_number:261 CONFIRM=true
```

**Parameters:**

- `build_number` (required): The build number of the TestFlight build to promote
- `CONFIRM=true` (required): Human gate to prevent accidental submissions

**Example:**

```bash
# Promote build 261 to App Store review
CONFIRM=true bundle exec fastlane promote build_number:261
```

**What it does:**

1. Authenticates with App Store Connect API
2. Finds the specified TestFlight build
3. Submits it for App Store review (manual release after approval)

**Note:** This does NOT create a new build. The build must already exist in TestFlight.

---

### `tf_upload` — Upload Pre-Built IPA to TestFlight

Upload an IPA file to TestFlight (backup/recovery path).

**Usage:**

```bash
cd ios
bundle exec fastlane tf_upload ipa_path:./path/to/build.ipa
```

**Parameters:**

- `ipa_path` (required): Path to the `.ipa` file to upload
- `SKIP_WAITING_FOR_BUILD_PROCESSING=true` (optional): Skip waiting for Apple's processing

**Example:**

```bash
# Upload an IPA and wait for processing
bundle exec fastlane tf_upload ipa_path:./.eas/artifacts/build-261.ipa

# Upload and skip waiting (useful for automation)
SKIP_WAITING_FOR_BUILD_PROCESSING=true bundle exec fastlane tf_upload ipa_path:./build.ipa
```

**What it does:**

1. Authenticates with App Store Connect API
2. Uploads the IPA to TestFlight
3. Optionally waits for Apple's processing to complete
4. Makes the build available to internal testers

---

## Security & Constraints

### 🔒 Secret Management

- **Never commit** `.p8` key files, `AuthKey_*.p8`, or credentials
- Store secrets in `.env` (gitignored) or environment variables
- Use App Store Connect API keys (not interactive Apple ID login)

### 🚫 What NOT to Use Fastlane For

- **Building the app** — Use EAS: `./build-and-submit.sh`
- **Initial TestFlight submission** — Use EAS: `npx eas submit`
- **Freestyle `deliver` or `gym` commands** — Not allowed; use named lanes only

### ✅ Allowed Operations

- **Promote TestFlight → App Store** — `bundle exec fastlane promote`
- **Upload pre-built IPA** — `bundle exec fastlane tf_upload`
- **Custom lanes** — Must be documented and approved before use

---

## Troubleshooting

### Error: "ASC API key file not found"

**Cause:** `ASC_KEY_PATH` environment variable not set or points to invalid path.

**Fix:**

```bash
# Check the path
echo $ASC_KEY_PATH

# Set to correct path
export ASC_KEY_PATH=/path/to/AuthKey_57D87U9MQ2.p8
```

### Error: "Missing App Store Connect API credentials"

**Cause:** Required environment variables not set.

**Fix:**

```bash
# Set all required variables
export ASC_KEY_ID=57D87U9MQ2
export ASC_ISSUER_ID=169799ef-c185-49f3-8c48-7d82e7ba7683
export ASC_KEY_PATH=/path/to/AuthKey_57D87U9MQ2.p8
```

### Error: "Refusing promote without CONFIRM=true"

**Cause:** Human gate requirement — `promote` requires explicit confirmation.

**Fix:**

```bash
# Add CONFIRM=true when you intend to submit for review
CONFIRM=true bundle exec fastlane promote build_number:261
```

---

## Integration with Existing Workflow

### Current EAS Workflow (Keep This)

```bash
# Daily DEV TestFlight build
./build-and-submit.sh ios dev

# Production App Store build
./build-and-submit.sh ios production true
```

### New Fastlane Workflow (Add This)

```bash
# After a build is in TestFlight and ready for App Store
cd ios
CONFIRM=true bundle exec fastlane promote build_number:261
```

**Flow:**

1. Build with EAS → TestFlight (existing)
2. Test on TestFlight
3. Promote to App Store review (new Fastlane lane)
4. Manual release after Apple approval

---

## Files in This Setup

```
ios/
├── Gemfile                  # Ruby gem dependencies (Fastlane)
├── Gemfile.lock            # Locked versions (generated by bundle install)
└── fastlane/
    ├── Appfile             # Bundle ID, Team ID (from ENV)
    ├── Fastfile            # Lane definitions (promote, tf_upload)
    └── README.md           # This file
```

---

## Related Documentation

- **EAS Build & Submit**: `./build-and-submit.sh` (existing source of truth)
- **Apple Credentials**: `documentation/APPLE_CREDENTIALS_CONFIG.md`
- **App Store Connect**: https://appstoreconnect.apple.com
- **Fastlane Docs**: https://docs.fastlane.tools

---

## Summary

- ✅ **Fastlane complements EAS** (does not replace it)
- ✅ **Use EAS for builds** (`./build-and-submit.sh`)
- ✅ **Use Fastlane for promotion** (`bundle exec fastlane promote`)
- ✅ **Secrets via environment variables only**
- ✅ **Human gate on promote** (requires `CONFIRM=true`)

**Questions?** Check the existing build documentation or open an issue.
