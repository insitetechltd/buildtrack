# Setup Google Play Service Account for EAS Submit

EAS Submit requires a Google Play service account to upload apps to the Play Store.

## Quick Setup Steps

### 1. Create Service Account in Google Cloud

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select or create a project
3. Navigate to **IAM & Admin** → **Service Accounts**
4. Click **Create Service Account**
5. Fill in:
   - **Name**: `eas-submit-service`
   - **Description**: `Service account for EAS Submit to Play Store`
6. Click **Create and Continue**
7. Skip role assignment (click **Continue**)
8. Click **Done**

### 2. Create JSON Key

1. Click on the service account you just created
2. Go to **Keys** tab
3. Click **Add Key** → **Create new key**
4. Select **JSON** format
5. Click **Create**
6. JSON file will download automatically
7. **Save this file securely** - you'll need it!

### 3. Grant Play Console Access

1. Go to [Google Play Console](https://play.google.com/console)
2. Navigate to **Setup** → **API access**
3. Find **Service accounts** section
4. Click **Link service account**
5. Enter the service account email (from the JSON file, field: `client_email`)
6. Click **Grant access**
7. Select your app: **com.buildtrack.app**
8. Grant permissions:
   - ✅ **Release apps to production tracks**
   - ✅ **Release apps to testing tracks** (optional, for internal/beta)
9. Click **Invite user**

### 4. Save Service Account Key

```bash
# Move the downloaded JSON file to your project
# Replace 'your-downloaded-file.json' with the actual filename
mv ~/Downloads/your-downloaded-file.json ./google-service-account.json

# Add to .gitignore (CRITICAL - never commit this!)
echo "google-service-account.json" >> .gitignore

# Set secure permissions
chmod 600 google-service-account.json
```

### 5. Update eas.json

The service account path is already configured in `eas.json`:

```json
"submit": {
  "production": {
    "android": {
      "serviceAccountKeyPath": "./google-service-account.json",
      "track": "internal"
    }
  }
}
```

### 6. Submit Your App

```bash
# Submit using the service account
eas submit --platform android --profile production --path android/app/build/outputs/bundle/release/app-release.aab
```

## Alternative: Use Interactive Mode (Without Service Account)

If you prefer not to use a service account, you can use interactive OAuth:

```bash
# Remove serviceAccountKeyPath from eas.json first, then:
eas submit --platform android --path android/app/build/outputs/bundle/release/app-release.aab
```

However, EAS may still require a service account for automated submissions.

## Troubleshooting

### "Service account not found"
- Verify the JSON file path in `eas.json`
- Check the file exists: `ls -la google-service-account.json`

### "Permission denied"
- Ensure service account has access in Play Console
- Check the service account email matches
- Verify permissions are granted

### "App not found"
- Create the app in Play Console first
- Ensure package name matches: `com.buildtrack.app`

## Security Notes

⚠️ **IMPORTANT**:
- Never commit `google-service-account.json` to git
- Store the JSON file securely
- Rotate keys if compromised
- Use different service accounts for different environments

## Service Account Email Format

The service account email will look like:
```
eas-submit-service@your-project-id.iam.gserviceaccount.com
```

This is found in the JSON file under `client_email`.

---

**Google Developer Account**: insite.tech.ltd@gmail.com  
**Package Name**: com.buildtrack.app




