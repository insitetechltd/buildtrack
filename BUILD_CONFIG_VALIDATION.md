# Build Configuration Validation System

This document explains the build configuration validation and persistence system that prevents regression issues.

## Overview

After experiencing keystore mismatch issues, we've implemented a system that:
1. **Validates** build configuration before building
2. **Saves** successful build configuration after successful submission
3. **Prevents** regression by checking against last successful configuration

## Components

### 1. `.build-config-success.json`

This file stores the last successful build configuration:
- Keystore file path and SHA-1 fingerprint
- Signing configuration settings
- Version information
- Validation rules

**Location**: Project root (gitignored)

### 2. `scripts/validate-build-config.sh`

Validates the current build configuration against the last successful build:
- ✅ Checks keystore file exists
- ✅ Verifies keystore.properties exists and points to correct file
- ✅ Validates keystore SHA-1 matches expected value
- ✅ Checks build.gradle uses correct signing configs

**Usage**:
```bash
./scripts/validate-build-config.sh
```

**Exit codes**:
- `0`: All validations passed
- `1`: Validation failed (errors found)

### 3. `scripts/save-successful-build-config.sh`

Saves the current build configuration after a successful build:
- Extracts keystore information
- Reads build.gradle configuration
- Saves to `.build-config-success.json`

**Usage**:
```bash
./scripts/save-successful-build-config.sh
```

## Integration with Build Script

The `build-and-submit-android.sh` script now:

1. **Before building**: Runs `validate-build-config.sh`
   - If validation fails, build is aborted
   - Prevents building with incorrect configuration

2. **After successful submission**: Runs `save-successful-build-config.sh`
   - Saves current configuration for next build
   - Ensures future builds use the same working configuration

## Workflow

```
┌─────────────────────────────────┐
│  Start Build                    │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│  Validate Configuration          │
│  (validate-build-config.sh)     │
└────────────┬────────────────────┘
             │
      ┌──────┴──────┐
      │             │
   ✅ Pass      ❌ Fail
      │             │
      │             └──► Abort Build
      │
      ▼
┌─────────────────────────────────┐
│  Build AAB                       │
└────────────┬────────────────────┘
             │
      ┌──────┴──────┐
      │             │
   ✅ Success   ❌ Fail
      │             │
      │             └──► Exit
      │
      ▼
┌─────────────────────────────────┐
│  Submit to Play Store           │
└────────────┬────────────────────┘
             │
      ┌──────┴──────┐
      │             │
   ✅ Success   ❌ Fail
      │             │
      │             └──► Exit
      │
      ▼
┌─────────────────────────────────┐
│  Save Configuration              │
│  (save-successful-build-config) │
└─────────────────────────────────┘
```

## Preventing Common Issues

### Issue: Wrong Keystore Used
**Prevention**: SHA-1 validation ensures keystore matches expected value

### Issue: Debug Signing in Release Build
**Prevention**: Checks build.gradle uses `signingConfigs.release` for release builds

### Issue: Missing Keystore Properties
**Prevention**: Verifies keystore.properties exists and is correctly configured

### Issue: Configuration Drift
**Prevention**: After each successful build, configuration is saved and validated on next build

## Manual Validation

You can manually validate configuration at any time:

```bash
./scripts/validate-build-config.sh
```

This is useful when:
- Making changes to build configuration
- Setting up a new environment
- Troubleshooting build issues

## Configuration File Format

The `.build-config-success.json` file structure:

```json
{
  "lastSuccessfulBuild": {
    "timestamp": "2026-01-13T09:56:00Z",
    "versionCode": 6,
    "versionName": "1.1.2",
    "keystore": {
      "file": "android/app/upload-keystore.jks",
      "sha1": "0C:FE:9A:F8:F9:9C:9C:85:C0:4C:F1:CB:E4:47:36:4D:33:19:B4:D5",
      "alias": "upload",
      "source": "google certificates/upload-keystore.jks"
    },
    "signingConfig": {
      "releaseBuildType": "signingConfigs.release",
      "debugBuildType": "signingConfigs.debug"
    },
    "buildGradle": {
      "releaseSigningConfig": "signingConfigs.release",
      "keystorePropertiesPath": "android/keystore.properties"
    }
  },
  "validationRules": {
    "checkKeystoreSha1": true,
    "checkSigningConfig": true,
    "verifyKeystoreExists": true,
    "verifyPropertiesFile": true
  }
}
```

## Troubleshooting

### Validation Fails: Keystore SHA-1 Mismatch

**Cause**: Keystore file changed or wrong keystore is being used

**Solution**:
1. Check if you're using the correct keystore from `google certificates/`
2. Verify keystore.properties points to the right file
3. If you intentionally changed keystore, update `.build-config-success.json` or delete it to reset

### Validation Fails: Signing Config Wrong

**Cause**: build.gradle was modified incorrectly

**Solution**:
1. Check `android/app/build.gradle`
2. Ensure release build type uses `signingConfig signingConfigs.release`
3. Ensure debug build type uses `signingConfig signingConfigs.debug`

### First Build (No Config File)

**Behavior**: Validation script will skip checks if no config file exists

**Action**: After first successful build, configuration will be saved automatically

## Best Practices

1. **Don't manually edit** `.build-config-success.json` unless you know what you're doing
2. **Run validation** before making build configuration changes
3. **Commit successful config** to version control (optional, for team reference)
4. **Review validation output** if build fails unexpectedly

## Future Enhancements

Potential improvements:
- Version code auto-increment validation
- Multiple keystore support (dev/staging/prod)
- Configuration migration helpers
- Team-wide configuration sharing

