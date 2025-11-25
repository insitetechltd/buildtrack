# Non-Interactive Local iOS Builds Configuration

## Overview

This guide explains how to run local iOS builds without any terminal interaction, using EAS remote credentials automatically.

## Problem Solved

Previously, local builds would prompt for:
- Apple account login
- Team selection
- Certificate selection
- Profile selection

This made automated builds and CI/CD pipelines difficult.

## Solution

Configure EAS to use **remote credentials** with **non-interactive mode** for local builds.

## Configuration Files

### 1. eas.json

Added a new `production-local` profile that:
- Extends the `production` profile
- Uses `credentialsSource: "remote"` to fetch credentials from EAS
- Uses `distribution: "internal"` for local builds
- Inherits all environment variables and settings

```json
{
  "build": {
    "production-local": {
      "extends": "production",
      "distribution": "internal",
      "ios": {
        "credentialsSource": "remote",
        "cocoapods": "1.16.1"
      },
      "android": {
        "credentialsSource": "remote",
        "gradleCommand": ":app:bundleRelease"
      }
    }
  }
}
```

### 2. build-local.sh

Enhanced the build script to:
- Check for `EXPO_TOKEN` in environment or `.env` file
- Run builds in `--non-interactive` mode
- Use the `production-local` profile by default
- Provide clear error messages if credentials are missing

## Prerequisites

### 1. EXPO_TOKEN

You need an Expo access token for non-interactive authentication.

#### Get Your Token:

```bash
# Login to Expo CLI
npx eas login

# Generate a token
npx eas whoami
# Visit: https://expo.dev/accounts/[your-account]/settings/access-tokens
```

#### Add to .env:

```bash
# .env file
EXPO_TOKEN=your_expo_token_here
```

### 2. EAS Credentials Setup

Ensure your iOS credentials are stored in EAS:

```bash
# Check credentials
npx eas credentials

# If not set up, configure them:
npx eas credentials --platform ios
```

Your credentials should include:
- ✅ Distribution Certificate
- ✅ Provisioning Profile
- ✅ Apple Team ID
- ✅ App Store Connect API Key (for submissions)

## Usage

### Basic Usage

```bash
# Build iOS using production-local profile (default)
./build-local.sh

# Build iOS explicitly
./build-local.sh production-local ios

# Build Android
./build-local.sh production-local android
```

### Advanced Usage

```bash
# Use a different profile
./build-local.sh preview ios

# Set EXPO_TOKEN inline (for CI/CD)
EXPO_TOKEN=your_token ./build-local.sh production-local ios
```

## How It Works

### 1. Authentication Flow

```
1. Script checks for EXPO_TOKEN
   ├─ Environment variable
   └─ .env file

2. EAS CLI authenticates using token
   └─ No login prompt needed

3. Build starts with --non-interactive flag
   └─ No user input required
```

### 2. Credential Flow

```
1. EAS reads credentialsSource: "remote"
   └─ Fetches credentials from EAS servers

2. Downloads signing certificates
   ├─ Distribution Certificate
   └─ Provisioning Profile

3. Configures Xcode automatically
   └─ No manual selection needed

4. Builds IPA locally
   └─ Output: build-[timestamp].ipa
```

## Troubleshooting

### Error: "EXPO_TOKEN not found"

**Solution:**
```bash
# Add to .env file
echo "EXPO_TOKEN=your_token_here" >> .env

# Or export in terminal
export EXPO_TOKEN=your_token_here
```

### Error: "No credentials found"

**Solution:**
```bash
# Set up credentials in EAS
npx eas credentials --platform ios

# Follow prompts to upload or generate credentials
```

### Error: "Build requires user input"

**Solution:**
```bash
# Ensure you're using the correct profile
./build-local.sh production-local ios

# Check eas.json has credentialsSource: "remote"
```

### Error: "Invalid credentials"

**Solution:**
```bash
# Refresh credentials
npx eas credentials --platform ios

# Re-download from Apple Developer Portal
# Select: "Set up new credentials"
```

## Profiles Comparison

| Profile | Distribution | Credentials | Use Case |
|---------|-------------|-------------|----------|
| `production` | store | remote | EAS cloud builds for App Store |
| `production-local` | internal | remote | Local builds with EAS credentials |
| `preview` | internal | remote | Testing builds |
| `simulator` | internal | remote | iOS Simulator builds |

## Benefits

### 1. **Automation Ready**
- No manual intervention needed
- Perfect for CI/CD pipelines
- Scriptable and repeatable

### 2. **Faster Builds**
- Local builds are faster than cloud builds
- No queue time
- Full control over build environment

### 3. **Credential Security**
- Credentials stored securely in EAS
- No local certificate files to manage
- Token-based authentication

### 4. **Consistent Environment**
- Same credentials as cloud builds
- Same configuration
- Same output format

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Build iOS Locally

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: macos-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build iOS
        env:
          EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}
        run: ./build-local.sh production-local ios
      
      - name: Upload IPA
        uses: actions/upload-artifact@v3
        with:
          name: ios-build
          path: build-*.ipa
```

### GitLab CI Example

```yaml
build-ios:
  stage: build
  image: macos-latest
  script:
    - npm ci
    - ./build-local.sh production-local ios
  artifacts:
    paths:
      - build-*.ipa
  variables:
    EXPO_TOKEN: $EXPO_TOKEN
```

## Security Best Practices

### 1. Token Management

```bash
# ✅ DO: Store in .env (gitignored)
EXPO_TOKEN=abc123...

# ✅ DO: Use environment variables in CI/CD
export EXPO_TOKEN=${{ secrets.EXPO_TOKEN }}

# ❌ DON'T: Commit tokens to git
# ❌ DON'T: Share tokens publicly
# ❌ DON'T: Use personal tokens in shared environments
```

### 2. Token Permissions

Create tokens with minimal required permissions:
- ✅ Read/Write access to your projects
- ✅ Build permissions
- ❌ Don't use owner tokens if not needed

### 3. Token Rotation

```bash
# Rotate tokens regularly (every 90 days)
# 1. Generate new token in Expo dashboard
# 2. Update .env file
# 3. Update CI/CD secrets
# 4. Revoke old token
```

## Related Scripts

- `build-local.sh` - Main local build script (non-interactive)
- `build-and-submit.sh` - Cloud build + submit to stores
- `increment-build.sh` - Bump version numbers

## Additional Resources

- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [EAS Credentials](https://docs.expo.dev/app-signing/app-credentials/)
- [Non-Interactive Mode](https://docs.expo.dev/build-reference/local-builds/)
- [Access Tokens](https://docs.expo.dev/accounts/programmatic-access/)

## Summary

✅ **Fully Automated**: No terminal interaction required
✅ **Secure**: Credentials managed by EAS
✅ **Fast**: Local builds are faster than cloud
✅ **CI/CD Ready**: Perfect for automation
✅ **Consistent**: Same credentials as production builds

---

**Last Updated**: November 12, 2025
**Status**: ✅ Configured and Ready


