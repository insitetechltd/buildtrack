# Upload Key Reset Guide

## Current Situation

- ✅ **Upload certificate found**: `upload_cert.der` (SHA-1: `5B:2A:6A:49:4B:C8:84:09:91:83:08:D9:94:4B:4B:F8:C9:E1:DC:16`)
- ❌ **Upload key keystore NOT found**: Searched EAS, local files, backups
- ⚠️ **Permission issue**: Current account doesn't have permission to reset upload key

## What You Need

To reset the upload key in Google Play Console, you need:
- **Account with Owner or Admin role** on the Google Play Console
- The account must have "Manage production releases" permission

## Steps to Reset Upload Key

### Option 1: Request Permission (If You're Not an Admin)

1. **Identify who has admin access**:
   - Go to Google Play Console → Settings → Users and permissions
   - Look for users with "Owner" or "Admin" role

2. **Contact the admin** and ask them to:
   - Either grant you permission to reset the upload key
   - Or reset it themselves (see Option 2)

### Option 2: Have an Admin Reset It

If you have admin access or can get an admin to do it:

1. **Go to Google Play Console**:
   - Navigate to: Your App → Setup → App integrity → App signing
   - Find "Upload key certificate" section

2. **Request Upload Key Reset**:
   - Click "Request upload key reset" button
   - Follow Google's verification process
   - This may require:
     - App verification
     - Domain verification (if applicable)
     - Contact information confirmation
     - Waiting period (usually 24-48 hours)

3. **After Approval**:
   - Google will approve the reset
   - You can then use your current keystore as the new upload key
   - Your current keystore SHA-1: `19:84:71:F5:89:60:32:CD:3E:FF:19:CE:E7:7C:F7:71:FC:18:D6:D3`

### Option 3: Use Your Current Keystore After Reset

Once the upload key is reset, configure your build to use your current keystore:

**Current keystore options:**
- `credentials/android/keystore.jks`
- `@insitetech__buildtrack.jks`
- `android/app/release-key.keystore`

All have the same SHA-1: `19:84:71:F5:89:60:32:CD:3E:FF:19:CE:E7:7C:F7:71:FC:18:D6:D3`

**After reset, update `android/keystore.properties`:**
```properties
storeFile=release-key.keystore
storePassword=<your-password>
keyAlias=<your-alias>
keyPassword=<your-key-password>
```

## Alternative: Continue Searching

If you want to keep searching for the original upload key keystore:

1. **Check with team members** who worked on the original app upload
2. **Search backup locations**:
   - Cloud storage (Google Drive, Dropbox, iCloud)
   - External drives
   - Password managers
   - Old computers/laptops
3. **Check if the keystore uses different credentials**:
   - Different password
   - Different alias/key name

## Current Keystore Information

**Keystore files found (all have same SHA-1):**
- `credentials/android/keystore.jks`
- `@insitetech__buildtrack.jks`
- `android/app/release-key.keystore`

**SHA-1**: `19:84:71:F5:89:60:32:CD:3E:FF:19:CE:E7:7C:F7:71:FC:18:D6:D3`

**Credentials** (from credentials.json):
- Store Password: `dfc88498be1516dad38326fe0c39bcf7`
- Key Alias: `e8005967b342362185383e2d4758121d`
- Key Password: `239fe622e253dce1659305b200a4e3d1`

## Next Steps

1. **Contact Play Console admin** to request upload key reset permission
2. **Or have admin reset it** for you
3. **Once reset is approved**, use your current keystore for future builds
4. **Update `android/keystore.properties`** to point to your keystore
5. **Rebuild and submit** - it should work!

## Important Notes

⚠️ **Before resetting:**
- Make sure you have a backup of your current production keystore
- Store the keystore password and key alias securely
- The reset process may take 24-48 hours for Google to approve

✅ **After resetting:**
- Your current keystore will become the new upload key
- All future uploads must use this keystore
- The app signing key (managed by Google) remains unchanged
- You can continue updating your app normally


