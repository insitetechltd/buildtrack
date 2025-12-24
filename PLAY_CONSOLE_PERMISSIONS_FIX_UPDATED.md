# Fix Play Console Service Account Permissions (Updated Guide)

Based on the latest [Google Play Developer API documentation](https://developers.google.com/android-publisher/getting_started), the process has been updated. **You no longer need to link your developer account to a Google Cloud Project**, and the "API access" method is deprecated.

## What Changed

**Old Method (Deprecated):**
- Used "Setup → API access" page
- Required linking service accounts via "Link service account" button

**New Method (Current):**
- Use "Users & Permissions" page
- Invite service account as a user with appropriate permissions
- More straightforward and secure

## Solution: Grant Play Console Permissions (Updated Process)

### Step 1: Enable Google Play Developer API

1. Go to: https://console.cloud.google.com/apis/library/androidpublisher.googleapis.com
2. Select your project: **taskr-481802** (or your Google Cloud project)
3. Click **Enable**
4. Wait 2-5 minutes for API to activate

### Step 2: Create Service Account (If Not Already Done)

If you already have a service account, skip to Step 3.

1. Go to: https://console.cloud.google.com/iam-admin/serviceaccounts
2. Select your project: **taskr-481802**
3. Click **Create Service Account**
4. Fill in details:
   - **Service account name**: `eas-submit-service` (or your preferred name)
   - **Description**: `Service account for EAS Submit to Google Play Store`
5. Click **Create and Continue**
6. Skip role assignment (optional) → Click **Continue**
7. Click **Done**

### Step 3: Grant Permissions via Users & Permissions (NEW METHOD)

According to the [official Google guide](https://developers.google.com/android-publisher/getting_started), use the "Users & Permissions" page:

1. **Go to Play Console Users & Permissions**:
   - Direct link: https://play.google.com/console/u/0/developers/~/users
   - Or: Play Console → **Users & Permissions** (in left sidebar)

2. **Invite Service Account as User**:
   - Click **Invite new users** button (top of page)
   - In the email field, enter your service account email:
     ```
     insite-works-ltd@taskr-481802.iam.gserviceaccount.com
     ```
     (Or your actual service account email from the JSON key file)

3. **Grant Permissions**:
   - Select the permissions needed for app submission:
     - ✅ **Release apps to production tracks**
     - ✅ **Release apps to testing tracks** (for internal/alpha/beta)
     - ✅ **View app information and download bulk reports** (optional but recommended)
   - **Select apps**: Check the box for **Taskr** (com.buildtrack.app)
     - If you want access to all apps, you can select "All apps" option

4. **Send Invitation**:
   - Click **Invite user**
   - The service account will now have the permissions you granted

### Step 4: Verify Access

After inviting the service account:

1. Go back to **Users & Permissions** page
2. Look for your service account email in the users list
3. Verify it shows:
   - Status: **Active** or **Pending** (should activate quickly)
   - Permissions showing the roles you granted
   - App access showing **Taskr** (or "All apps")

### Step 5: Retry Submission

After granting permissions via Users & Permissions:

```bash
cd "/Volumes/KooDrive/Insite App"
eas submit --platform android --profile production --path android/app/build/outputs/bundle/release/app-release.aab --non-interactive
```

Or use your submission script:
```bash
./submit-to-play-store.sh production
```

## Important Differences from Old Method

| Old Method (Deprecated) | New Method (Current) |
|------------------------|---------------------|
| Setup → API access | Users & Permissions |
| "Link service account" button | "Invite new users" button |
| Service account appears in API access list | Service account appears in users list |
| Grant access to service account | Invite service account as user with permissions |

## Common Issues

### "Service account email not found"

**Solution**: Make sure you're using the exact email from your service account JSON key file:
- Open: `google-service-account.json` or `taskr-481802-51f58413435b.json`
- Look for `"client_email"` field
- Use that exact email address

### "Permission denied" after inviting

**Solution**: 
1. Verify you selected the correct app (Taskr / com.buildtrack.app)
2. Check that you granted "Release apps to production tracks" permission
3. Wait 2-5 minutes for permissions to propagate
4. Make sure the service account status is "Active" in Users & Permissions

### "API not enabled"

**Solution**: Enable the Google Play Android Developer API:
- Link: https://console.cloud.google.com/apis/library/androidpublisher.googleapis.com
- Select your project and click **Enable**

## Verification Checklist

Before retrying submission, verify:

- [ ] Google Play Android Developer API is enabled in Cloud Console
- [ ] Service account created in Google Cloud Console
- [ ] Service account invited in Play Console → Users & Permissions
- [ ] Service account shows "Active" status in Users & Permissions
- [ ] Service account has "Release apps to production tracks" permission
- [ ] Taskr app (com.buildtrack.app) is selected for service account access
- [ ] Waited 2-5 minutes after making changes

## Quick Links

- **Users & Permissions**: https://play.google.com/console/u/0/developers/~/users
- **Enable API**: https://console.cloud.google.com/apis/library/androidpublisher.googleapis.com
- **Service Accounts (Cloud Console)**: https://console.cloud.google.com/iam-admin/serviceaccounts
- **Official Guide**: https://developers.google.com/android-publisher/getting_started
- **Service Account Email**: insite-works-ltd@taskr-481802.iam.gserviceaccount.com

## Reference

This guide is based on the official Google documentation:
- [Google Play Developer API - Getting Started](https://developers.google.com/android-publisher/getting_started)
- Last updated in Google's docs: 2025-12-18 UTC

---

**Key Changes Summary**:
- ✅ No longer need to link developer account to Google Cloud Project
- ✅ Use "Users & Permissions" instead of "API access" page
- ✅ Invite service account as a user with permissions
- ✅ More straightforward and secure process

