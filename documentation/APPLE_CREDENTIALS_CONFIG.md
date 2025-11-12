# Apple Credentials Configuration for Non-Interactive Builds

## Overview

This guide explains how Apple credentials are configured to eliminate prompts during local builds.

## Problem Solved

Previously, local builds would prompt for:
1. ❌ "Do you want to log in to your Apple account?" → **yes**
2. ❌ "Apple ID:" → **tristan.koo@insiteworks.com**

Now these are configured automatically!

## Configuration Files

### 1. `.env` File

Apple credentials are stored in `.env` (which is gitignored for security):

```bash
# Apple Credentials for Non-Interactive Builds
EXPO_APPLE_ID=tristan.koo@insiteworks.com
EXPO_APPLE_TEAM_ID=DSNR656S6Y

# Expo Authentication Token
EXPO_TOKEN=your_expo_token_here
```

### 2. `eas.json` Configuration

The `production-local` profile includes Apple credentials as environment variables:

```json
{
  "build": {
    "production-local": {
      "extends": "production",
      "distribution": "internal",
      "ios": {
        "credentialsSource": "remote",
        "cocoapods": "1.16.1",
        "autoIncrement": true
      },
      "env": {
        "EXPO_APPLE_ID": "tristan.koo@insiteworks.com",
        "EXPO_APPLE_TEAM_ID": "DSNR656S6Y"
      }
    }
  }
}
```

### 3. `build-local.sh` Script

The build script automatically:
1. ✅ Loads credentials from `.env`
2. ✅ Exports them as environment variables
3. ✅ Verifies they're set before building
4. ✅ Runs build in `--non-interactive` mode

## How It Works

### Build Flow

```
1. Run: ./build-local.sh
   └─ Loads .env file

2. Export Environment Variables
   ├─ EXPO_APPLE_ID
   ├─ EXPO_APPLE_TEAM_ID
   └─ EXPO_TOKEN

3. Check EAS Authentication
   └─ npx eas whoami

4. Verify Apple Credentials
   ├─ Apple ID: tristan.koo@insiteworks.com
   └─ Team ID: DSNR656S6Y

5. Start Build (Non-Interactive)
   └─ npx eas build --local --non-interactive

6. Build Completes Without Prompts! ✅
```

## Apple Team ID Reference

Your Apple Team ID: **DSNR656S6Y**

This corresponds to your Apple Developer account and is used to:
- Sign the app with the correct certificate
- Generate provisioning profiles
- Submit to App Store Connect

## Usage

### Standard Build (No Prompts)

```bash
./build-local.sh
```

Output:
```
🔨 BuildTrack Local Build Helper (Non-Interactive)

Profile: production-local
Platform: ios

Loading credentials from .env...
Checking EAS authentication...
✅ Logged in as: tristankoo
✅ Apple ID: tristan.koo@insiteworks.com
✅ Apple Team ID: DSNR656S6Y

Starting local build...
[Build proceeds without any prompts]
```

### Override Apple ID (Temporary)

```bash
EXPO_APPLE_ID=other@email.com ./build-local.sh
```

### Different Profile

```bash
./build-local.sh preview ios
```

## Security Best Practices

### 1. Never Commit Credentials

```bash
# ✅ .gitignore already includes:
.env
*.env

# ❌ Never commit:
# - Apple ID
# - Team ID
# - Expo Token
# - Any passwords
```

### 2. Use App-Specific Passwords

For enhanced security, use an Apple App-Specific Password:

1. Go to: https://appleid.apple.com
2. Sign in with your Apple ID
3. Navigate to: Security → App-Specific Passwords
4. Generate a new password for "EAS Build"
5. Use this password when prompted (if ever needed)

### 3. Environment Variable Precedence

Priority (highest to lowest):
1. Command-line environment variables
2. `.env` file
3. `eas.json` env section

Example:
```bash
# This overrides .env
EXPO_APPLE_TEAM_ID=DIFFERENT123 ./build-local.sh
```

## Troubleshooting

### Error: "Apple ID not set"

**Symptoms:**
```
⚠️  Warning: Apple credentials not found in .env
Build may prompt for Apple account information
```

**Solution:**
```bash
# Check .env file
cat .env | grep EXPO_APPLE

# If missing, add them:
echo "EXPO_APPLE_ID=tristan.koo@insiteworks.com" >> .env
echo "EXPO_APPLE_TEAM_ID=DSNR656S6Y" >> .env
```

### Error: "Invalid Team ID"

**Symptoms:**
```
Error: Team with ID 'XXXX' not found
```

**Solution:**
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

