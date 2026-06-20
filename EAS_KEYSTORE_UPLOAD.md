# Uploading Keystore to EAS

## Important Distinction

**Certificate vs Keystore:**
- **Certificate** (`upload_cert.der`): Public key only - cannot be used for signing
- **Keystore** (`.jks` or `.keystore`): Contains private key - required for signing

EAS needs the **keystore file**, not just the certificate.

## Uploading a Keystore to EAS

To upload a keystore file to EAS, use the interactive command:

```bash
npx eas credentials --platform android
```

**Follow these steps:**

1. **Select build profile**: Choose the profile you want to associate the keystore with (e.g., `production`)

2. **Choose action**: Select "Upload/Download credentials between EAS servers and your local json"

3. **Select option**: Choose "Upload credentials to EAS from credentials.json" or "Set up new credentials"

4. **Provide keystore information**:
   - Keystore file path (e.g., `credentials/android/keystore.jks`)
   - Keystore password
   - Key alias
   - Key password

## Your Current Situation

You have:
- ✅ **Upload certificate** (`upload_cert.der`) - public key only
- ❌ **Upload key keystore** - private key NOT found

**You cannot upload just the certificate to EAS** because:
- EAS needs the keystore file (with private key) to sign your app
- The certificate is public information (already visible in Play Console)
- Without the keystore, you cannot sign new builds

## Solution

Since you don't have the upload key keystore:

1. **Reset upload key in Play Console** (requires admin permission)
2. **After reset**, use your current keystore as the new upload key
3. **Optionally upload your current keystore to EAS** for future EAS builds:

```bash
# After reset is approved, upload your current keystore
npx eas credentials --platform android
# Select: production profile
# Choose: Upload credentials to EAS
# Provide: credentials/android/keystore.jks and passwords
```

## Current Keystore Files

You have these keystore files (all have same SHA-1: `19:84:71:F5:89:60:32:CD:3E:FF:19:CE:E7:7C:F7:71:FC:18:D6:D3`):
- `credentials/android/keystore.jks`
- `@insitetech__buildtrack.jks`
- `android/app/release-key.keystore`

**Note**: These don't match the upload key certificate SHA-1 (`5B:2A:6A:49:4B:C8:84:09:91:83:08:D9:94:4B:4B:F8:C9:E1:DC:16`), so they cannot be used until the upload key is reset.

## Summary

- ❌ **Cannot upload certificate** - EAS needs keystore file
- ❌ **Don't have upload key keystore** - need to reset upload key
- ✅ **Have current keystore** - can use after reset
- ✅ **Can upload keystore to EAS** - after reset, using `npx eas credentials --platform android`


