# Download All Keystores from EAS Profiles

This guide helps you download and verify keystores from all EAS profiles to find the one that matches your upload key.

## Quick Start

Run the automated script:

```bash
./download-all-eas-keystores.sh
```

## What the Script Does

1. **Reads all profiles** from `eas.json`:
   - `production`
   - `production-local`
   - `preview`
   - `simulator`
   - `expo-go`

2. **For each profile**:
   - Downloads credentials from EAS (interactive step)
   - Extracts the keystore file
   - Verifies SHA-1 against expected upload key
   - Saves all keystores to `eas-keystores/` directory

3. **When it finds a match**:
   - Stops searching
   - Creates `eas-keystores/MATCHED_KEYSTORE.txt` with instructions
   - Shows you exactly what to do next

## Expected Upload Key

The script is looking for a keystore with SHA-1:
```
5B:2A:6A:49:4B:C8:84:09:91:83:08:D9:94:4B:4B:F8:C9:E1:DC:16
```

## How to Use

### Step 1: Run the Script

```bash
./download-all-eas-keystores.sh
```

### Step 2: Interactive Steps

For each profile, you'll be prompted:

1. **EAS will ask which profile** - Select the profile name shown
2. **Choose action** - Select: `credentials.json: Upload/Download credentials between EAS servers and your local json`
3. **Select option** - Choose: `Download credentials from EAS to credentials.json`

The script will automatically:
- Extract the keystore
- Verify if it matches
- Move to the next profile if it doesn't match

### Step 3: When Match is Found

If a matching keystore is found, you'll see:

```
✅✅✅ MATCH! This is the upload key keystore! ✅✅✅
```

The script will create `eas-keystores/MATCHED_KEYSTORE.txt` with:
- Profile name
- Keystore file location
- Credentials (password, alias, etc.)
- Instructions on how to use it

### Step 4: Use the Matching Keystore

Follow the instructions in `MATCHED_KEYSTORE.txt`:

```bash
# 1. Copy the keystore
cp eas-keystores/keystore-<profile>.keystore android/app/release-key.keystore

# 2. Update keystore.properties (credentials are in MATCHED_KEYSTORE.txt)
# Edit android/keystore.properties with the values from MATCHED_KEYSTORE.txt

# 3. Rebuild
cd android && ./gradlew clean bundleRelease && cd ..

# 4. Submit
npx eas submit --platform android --path android/app/build/outputs/bundle/release/app-release.aab
```

## Output Files

All downloaded files are saved in `eas-keystores/`:

- `credentials-<profile>.json` - Credentials for each profile
- `keystore-<profile>.keystore` - Keystore file for each profile
- `download-<profile>.log` - Download logs
- `MATCHED_KEYSTORE.txt` - Info about the matching keystore (if found)

## Troubleshooting

### "jq not found"
Install jq:
```bash
brew install jq  # macOS
```

### "keytool not found"
Install Java JDK (keytool comes with it):
```bash
brew install openjdk  # macOS
```

### Profile doesn't have Android credentials
Some profiles (like `expo-go`, `simulator`) might only have iOS credentials. The script will skip them automatically.

### No match found
If no keystore matches:
1. Check if there are other profiles not in `eas.json`
2. The upload might have been done manually (not via EAS)
3. You may need to reset the upload key in Play Console

## Manual Alternative

If you prefer to do it manually:

```bash
# For each profile:
npx eas credentials --platform android --profile <profile-name>
# Select: Download credentials from EAS to credentials.json

# Extract keystore
cat credentials.json | jq -r '.android.keystore.keystore' | base64 -d > keystore-<profile>.keystore

# Verify SHA-1
keytool -list -v -keystore keystore-<profile>.keystore \
  -storepass $(jq -r '.android.keystore.keystorePassword' credentials.json) \
  -alias $(jq -r '.android.keystore.keyAlias' credentials.json) | grep SHA1
```

## Profiles to Check

Based on your `eas.json`, these profiles have Android credentials:
- ✅ `production` - Most likely candidate
- ✅ `production-local` - Also likely
- ⚠️ `preview` - Might have Android credentials
- ❌ `simulator` - iOS only
- ❌ `expo-go` - iOS only

Start with `production` and `production-local` first!

