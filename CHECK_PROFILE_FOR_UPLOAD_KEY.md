# Finding Which EAS Profile Created the Upload Key

## The Problem

The upload key was created when the app was **first uploaded to Google Play Store**. We need to identify which EAS build profile was used for that first upload.

## Current Situation

From `eas.json`, these profiles use remote Android credentials:
- **`production`**: `credentialsSource: "remote"`
- **`production-local`**: `credentialsSource: "remote"` (extends production)

Both profiles might:
1. Share the same keystore (if `production-local` extends `production`)
2. Have different keystores (if they were set up separately)

## How to Find Which Profile Created the Upload Key

### Method 1: Check EAS Build History

The upload key was created when the **first successful build** was submitted to Play Store.

```bash
# Check build history
npx eas build:list --platform android --limit 50

# Look for:
# - The OLDEST successful build
# - Builds with "distribution: store"
# - The profile used for that build
```

**From recent build history:**
- Most recent builds use profile: **`production`**
- But we need to find the **first** successful Play Store upload

### Method 2: Check Credentials for Each Profile

Download credentials for each profile and check if any match the upload key:

**Upload Key SHA-1:** `5B:2A:6A:49:4B:C8:84:09:91:83:08:D9:94:4B:4B:F8:C9:E1:DC:16`

**Steps:**

1. **Check `production` profile:**
   ```bash
   npx eas credentials --platform android
   # Select: production
   # Choose: Download credentials from EAS to credentials.json
   # Verify SHA-1 matches upload key
   ```

2. **Check `production-local` profile:**
   ```bash
   npx eas credentials --platform android
   # Select: production-local
   # Choose: Download credentials from EAS to credentials.json
   # Verify SHA-1 matches upload key
   ```

3. **Compare:**
   - If either profile's keystore has SHA-1 `5B:2A:6A:49:...`, that's the profile that created the upload key
   - If neither matches, the upload key might have been created:
     - Before EAS was used (manual upload)
     - With a different profile that no longer exists
     - With credentials that were later replaced

### Method 3: Check Build Logs

If you have access to the first successful build:

```bash
# View build details
npx eas build:view [BUILD_ID]

# Check the build logs for:
# - Which profile was used
# - Credential information
# - Submission details
```

## What We Know

- ✅ **Upload certificate SHA-1**: `5B:2A:6A:49:4B:C8:84:09:91:83:08:D9:94:4B:4B:F8:C9:E1:DC:16`
- ❌ **Current keystores checked**: All have SHA-1 `19:84:71:F5:89:60:32:CD:3E:FF:19:CE:E7:7C:F7:71:FC:18:D6:D3`
- ❌ **Production profile keystore**: Doesn't match (already checked)
- ❓ **Production-local profile**: Not checked yet

## Next Steps

1. **Check `production-local` profile credentials:**
   ```bash
   npx eas credentials --platform android
   # Select: production-local
   # Download and verify
   ```

2. **Check older build history:**
   - Look for the first successful Play Store submission
   - Note which profile was used

3. **If neither profile matches:**
   - The upload key might have been created manually (not via EAS)
   - Or with a profile that was later removed
   - In this case, you'll need to reset the upload key

## Quick Check Script

You can use this to check both profiles:

```bash
# Check production profile
npx eas credentials --platform android
# Select: production, Download

# Check if matches
./verify-upload-keystore.sh credentials/android/keystore.jks <password> <alias>

# Check production-local profile  
npx eas credentials --platform android
# Select: production-local, Download

# Check if matches
./verify-upload-keystore.sh credentials/android/keystore.jks <password> <alias>
```

## Summary

The upload key was likely created with either:
- **`production`** profile (most common for Play Store)
- **`production-local`** profile (if used for first upload)
- **Manual upload** (not via EAS, in which case EAS wouldn't have the key)

Since `production` profile's keystore doesn't match, try checking `production-local` next.


