# Google Service Account Setup - Step by Step

Follow these steps to create a Google Play service account for EAS Submit.

## Prerequisites

- Google Play Developer account: insite.tech.ltd@gmail.com
- Access to Google Cloud Console
- Access to Google Play Console

## Step 1: Create Service Account in Google Cloud

### 1.1 Go to Google Cloud Console

1. Open browser and go to: https://console.cloud.google.com/
2. Sign in with: **insite.tech.ltd@gmail.com**
3. If prompted, select or create a project:
   - Project name: `buildtrack-app` (or any name)
   - Click **Create**

### 1.2 Navigate to Service Accounts

1. In the left sidebar, click **IAM & Admin**
2. Click **Service Accounts**
3. You should see a list (may be empty)

### 1.3 Create New Service Account

1. Click **+ CREATE SERVICE ACCOUNT** (top of page)
2. Fill in the form:
   - **Service account name**: `eas-submit-service`
   - **Service account ID**: (auto-filled, keep default)
   - **Description**: `Service account for EAS Submit to Google Play Store`
3. Click **CREATE AND CONTINUE**

### 1.4 Skip Role Assignment

1. In "Grant this service account access to project":
   - **Skip this step** (click **CONTINUE**)
   - We don't need Cloud roles, only Play Console access
2. Click **DONE**

### 1.5 Service Account Created

You should now see `eas-submit-service@your-project-id.iam.gserviceaccount.com` in the list.

**Note the email address** - you'll need it in Step 3!

## Step 2: Create JSON Key

### 2.1 Open Service Account

1. Click on the service account you just created (`eas-submit-service`)
2. You'll see details page

### 2.2 Create Key

1. Click the **KEYS** tab (top of page)
2. Click **ADD KEY** → **Create new key**
3. Select **JSON** (not P12)
4. Click **CREATE**

### 2.3 Download JSON File

1. A JSON file will automatically download
2. **Save this file** - you'll need it!
3. The file name will be something like: `your-project-id-xxxxx.json`
4. **IMPORTANT**: This file contains sensitive credentials - keep it secure!

### 2.4 Note the Service Account Email

Open the JSON file and find the `client_email` field. It looks like:
```json
"client_email": "eas-submit-service@your-project-id.iam.gserviceaccount.com"
```

**Copy this email** - you'll need it in the next step!

## Step 3: Grant Play Console Access

### 3.1 Go to Play Console

1. Open new tab: https://play.google.com/console
2. Sign in with: **insite.tech.ltd@gmail.com**
3. Select your app: **Taskr** (or create it if it doesn't exist)

### 3.2 Navigate to API Access

1. In left sidebar, click **Setup** (gear icon)
2. Click **API access**
3. Scroll down to **Service accounts** section

### 3.3 Link Service Account

1. Click **Link service account** button
2. A dialog will open
3. Paste the service account email from Step 2.4:
   ```
   eas-submit-service@your-project-id.iam.gserviceaccount.com
   ```
4. Click **LINK**

### 3.4 Grant Permissions

1. After linking, you'll see the service account in the list
2. Click **Grant access** (or the service account name)
3. A new page opens: **Grant access to service account**

### 3.5 Select App and Permissions

1. **Select app**: Check the box for **Taskr** (com.buildtrack.app)
2. **Grant permissions**:
   - ✅ **Release apps to production tracks**
   - ✅ **Release apps to testing tracks** (optional, for internal/beta)
   - ✅ **View app information and download bulk reports** (optional)
3. Click **APPLY**

### 3.6 Verify Access

1. Go back to **API access** page
2. You should see your service account with:
   - Status: **Active**
   - Access level: **Admin** (or your selected permissions)

## Step 4: Save Service Account Key in Project

### 4.1 Move JSON File to Project

```bash
# In your terminal, navigate to project root
cd "/Volumes/KooDrive/Insite App"

# Move the downloaded JSON file (replace with actual filename)
# The file is usually in Downloads folder
mv ~/Downloads/your-project-id-*.json ./google-service-account.json

# Verify it's there
ls -la google-service-account.json
```

### 4.2 Secure the File

```bash
# Set secure permissions (only you can read)
chmod 600 google-service-account.json

# Verify permissions
ls -l google-service-account.json
# Should show: -rw------- (only owner can read/write)
```

### 4.3 Add to .gitignore

```bash
# Add to .gitignore to prevent committing
echo "google-service-account.json" >> .gitignore

# Verify it's in .gitignore
grep "google-service-account.json" .gitignore
```

## Step 5: Update eas.json

The `eas.json` file is already configured! Just verify:

```json
"submit": {
  "production": {
    "android": {
      "track": "internal"
    }
  }
}
```

**Note**: The `serviceAccountKeyPath` will be automatically detected if the file is named `google-service-account.json` in the project root.

## Step 6: Test Submission

### 6.1 Verify Setup

```bash
# Check EAS is logged in
eas whoami

# Verify service account file exists
ls -la google-service-account.json
```

### 6.2 Submit to Play Store

```bash
# Option 1: Use the automated script
./submit-to-play-store.sh internal

# Option 2: Use EAS directly
eas submit --platform android \
    --profile production \
    --path android/app/build/outputs/bundle/release/app-release.aab \
    --track internal
```

## Troubleshooting

### "Service account not found"

**Check**:
- Is the JSON file in the project root?
- Is it named `google-service-account.json`?
- Check file permissions: `ls -la google-service-account.json`

### "Permission denied"

**Check**:
- Service account has access in Play Console (Step 3)
- App is selected in permissions
- Permissions include "Release apps to production tracks"

### "App not found"

**Solution**:
1. Create app in Play Console first
2. Ensure package name matches: `com.buildtrack.app`
3. Complete initial app setup

### "Invalid credentials"

**Check**:
- JSON file is valid (not corrupted)
- Service account email matches in Play Console
- Key hasn't been deleted or rotated

## Security Checklist

- [ ] JSON file has secure permissions (600)
- [ ] JSON file is in `.gitignore`
- [ ] JSON file is backed up securely
- [ ] Service account has minimal required permissions
- [ ] Service account email is noted for reference

## Quick Reference

**Service Account Email Format**:
```
eas-submit-service@your-project-id.iam.gserviceaccount.com
```

**JSON File Location**:
```
./google-service-account.json
```

**Play Console API Access**:
```
https://play.google.com/console → Setup → API access
```

**Submit Command**:
```bash
./submit-to-play-store.sh internal
```

---

**Google Account**: insite.tech.ltd@gmail.com  
**Package Name**: com.buildtrack.app  
**Service Account Name**: eas-submit-service


