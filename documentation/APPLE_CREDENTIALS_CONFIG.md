# Apple Credentials Configuration

## Purpose

This guide explains how to configure Apple credentials for non-interactive local and CI builds without storing account-specific values in tracked Markdown files.

## Secure Configuration

Store Apple credentials only in local environment files or your CI secret manager.

Example local `.env` values:

```bash
EXPO_APPLE_ID=your-apple-id@example.com
EXPO_APPLE_TEAM_ID=YOURTEAMID
EXPO_TOKEN=your_expo_token
```

Do not commit real Apple IDs, team identifiers, app-specific passwords, or Expo tokens into Markdown, source files, or tracked config.

## Recommended Flow

1. Add the required values to a gitignored environment file.
2. Make sure the relevant build profile reads those values from the environment rather than hardcoding them.
3. Verify Expo authentication before starting a non-interactive build.
4. Run the build command from the preferred local build runbook in [NON_INTERACTIVE_LOCAL_BUILDS.md](./NON_INTERACTIVE_LOCAL_BUILDS.md).

## EAS Profile Guidance

- Prefer environment-variable driven configuration over checked-in secrets.
- Keep `credentialsSource` aligned with your current EAS setup.
- If local builds require Apple credentials, load them at runtime from the environment.

## Security Rules

- Never commit real credential values.
- Never paste account-specific values into troubleshooting docs.
- Use app-specific passwords or provider-approved secret flows when required.
- Rotate credentials if you suspect they were exposed in local notes or shell history.

## Troubleshooting

### Missing Apple credentials

Symptoms:

```text
Build prompts for Apple login details or fails before credential resolution.
```

Checks:

```bash
printenv EXPO_APPLE_ID
printenv EXPO_APPLE_TEAM_ID
printenv EXPO_TOKEN
```

### Invalid team or account mapping

Symptoms:

```text
Build fails because the Apple team or account does not match the expected signing setup.
```

Actions:

- Confirm the Apple account has access to the correct team.
- Confirm the team identifier matches your Apple Developer account.
- Re-run the non-interactive build only after environment values are corrected.

## Related Docs

- [NON_INTERACTIVE_LOCAL_BUILDS.md](./NON_INTERACTIVE_LOCAL_BUILDS.md)
- [BUILD_ERRORS_SOLUTIONS.md](./BUILD_ERRORS_SOLUTIONS.md)
```bash
# Verify your Team ID
# 1. Visit: https://developer.apple.com/account
# 2. Check: Membership → Team ID
# 3. Update .env with correct Team ID

# Your current Team ID: DSNR656S6Y
```

### Error: "Apple ID authentication failed"

**Symptoms:**
```
Error: Authentication with Apple ID failed
```

**Solution:**
```bash
# 1. Check if 2FA is required
# 2. You may need to generate an app-specific password
# 3. Use EAS credentials system instead:

npx eas credentials --platform ios
# Select: "Set up credentials from scratch"
```

### Build Still Prompting for Input

**Symptoms:**
Build asks for Apple account despite configuration

**Solutions:**

1. **Verify environment variables are loaded:**
```bash
# Add debug output to build-local.sh:
echo "EXPO_APPLE_ID: $EXPO_APPLE_ID"
echo "EXPO_APPLE_TEAM_ID: $EXPO_APPLE_TEAM_ID"
```

2. **Check .env file format:**
```bash
# ✅ Correct format (no spaces around =):
EXPO_APPLE_ID=tristan.koo@insiteworks.com

# ❌ Wrong format:
EXPO_APPLE_ID = tristan.koo@insiteworks.com
```

3. **Re-export variables:**
```bash
export EXPO_APPLE_ID="tristan.koo@insiteworks.com"
export EXPO_APPLE_TEAM_ID="DSNR656S6Y"
./build-local.sh
```

## Finding Your Apple Team ID

### Method 1: Apple Developer Portal
1. Visit: https://developer.apple.com/account
2. Sign in with your Apple ID
3. Go to: Membership
4. Look for: Team ID

### Method 2: Xcode
1. Open Xcode
2. Preferences → Accounts
3. Select your Apple ID
4. Click "Manage Certificates"
5. Team ID shown in parentheses

### Method 3: App Store Connect
1. Visit: https://appstoreconnect.apple.com
2. Users and Access → Keys
3. Team ID shown in Issuer ID

## Updating Credentials

### Change Apple ID

```bash
# Edit .env file
nano .env

# Update line:
EXPO_APPLE_ID=new_email@example.com

# Save and run build
./build-local.sh
```

### Change Team ID

```bash
# Edit .env file
nano .env

# Update line:
EXPO_APPLE_TEAM_ID=NEWTEAM123

# Also update eas.json:
nano eas.json
# Change EXPO_APPLE_TEAM_ID in production-local profile

# Save and run build
./build-local.sh
```

## Summary

✅ **No Prompts**: Apple ID and Team ID configured automatically
✅ **Secure**: Credentials stored in `.env` (gitignored)
✅ **Flexible**: Can override per-build if needed
✅ **CI/CD Ready**: Environment variables work in pipelines
✅ **Non-Interactive**: Fully automated build process

## Current Configuration

Your current setup:
- **Apple ID**: tristan.koo@insiteworks.com
- **Team ID**: DSNR656S6Y
- **Profile**: production-local
- **Credentials**: Remote (from EAS)
- **Status**: ✅ Configured and Ready

---

**Last Updated**: November 12, 2025
**Status**: ✅ Configured for Non-Interactive Builds



