# Fix Play Console Service Account Permissions

The issue is that your service account needs **Play Console permissions**, not just Google Cloud Console permissions.

## The Problem

- ✅ Service account has Owner role in **Google Cloud Console** (this is correct)
- ❌ Service account may not have permissions in **Google Play Console** (this is the issue)

These are **two different systems**:
1. **Google Cloud Console**: Manages the service account and API access
2. **Google Play Console**: Manages app releases and needs explicit permission grants

## Solution: Grant Play Console Access

### Step 1: Go to Play Console API Access

1. Open: https://play.google.com/console
2. Sign in with: **insite.tech.ltd@gmail.com**
3. In left sidebar, click **Setup** (gear icon)
4. Click **API access**

### Step 2: Find Your Service Account

Look for this service account in the list:
```
insite-works-ltd@taskr-481802.iam.gserviceaccount.com
```

### Step 3: Grant Access (If Not Already Done)

1. If you see the service account but it says "No access" or similar:
   - Click **Grant access** (or click on the service account name)
   
2. If the service account is NOT in the list:
   - Click **Link service account** button
   - Enter: `insite-works-ltd@taskr-481802.iam.gserviceaccount.com`
   - Click **Link**

### Step 4: Set Permissions

When granting access, you'll see a form:

1. **Select app**: Check the box for **Taskr** (com.buildtrack.app)

2. **Grant permissions** - Select these:
   - ✅ **Release apps to production tracks**
   - ✅ **Release apps to testing tracks** (for internal/alpha/beta)
   - ✅ **View app information and download bulk reports** (optional but recommended)

3. Click **Apply** or **Save**

### Step 5: Verify Access

After granting access, you should see:
- Service account listed in **API access** page
- Status: **Active**
- Access level showing the permissions you granted

## Step 6: Enable the API (If Still Needed)

Even with Play Console permissions, you may still need to enable the API:

1. Go to: https://console.developers.google.com/apis/api/androidpublisher.googleapis.com/overview?project=101225572090
2. Click **Enable** (if not already enabled)
3. Wait 2-5 minutes for propagation

## Step 7: Retry Submission

After granting Play Console permissions:

```bash
cd "/Volumes/KooDrive/Insite App"
eas submit --platform android --profile production --path android/app/build/outputs/bundle/release/app-release.aab --non-interactive
```

## Common Issues

### "Service account not found in Play Console"

**Solution**: You need to link it first:
1. In Play Console → Setup → API access
2. Click **Link service account**
3. Enter the service account email
4. Then grant permissions

### "Permission denied" after linking

**Solution**: Make sure you:
1. Selected the correct app (Taskr / com.buildtrack.app)
2. Granted "Release apps to production tracks" permission
3. Clicked Apply/Save

### "API not enabled"

**Solution**: Enable the Google Play Android Developer API:
- Link: https://console.developers.google.com/apis/api/androidpublisher.googleapis.com/overview?project=101225572090

## Verification Checklist

Before retrying submission, verify:

- [ ] Service account is listed in Play Console → Setup → API access
- [ ] Service account shows "Active" status
- [ ] Service account has access to app: **Taskr** (com.buildtrack.app)
- [ ] Permissions include "Release apps to production tracks"
- [ ] Google Play Android Developer API is enabled in Cloud Console
- [ ] Waited 2-5 minutes after making changes

## Quick Links

- **Play Console API Access**: https://play.google.com/console/u/0/developers/~/api-access
- **Enable API**: https://console.developers.google.com/apis/api/androidpublisher.googleapis.com/overview?project=101225572090
- **Service Account Email**: insite-works-ltd@taskr-481802.iam.gserviceaccount.com

---

**Key Point**: Owner role in Google Cloud Console is correct, but you ALSO need explicit permissions in Google Play Console for the service account to submit apps.


