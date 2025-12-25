# Manual Play Store Upload Guide

Alternative method to upload AAB directly through Google Play Console (without EAS).

## When to Use Manual Upload

- Service account setup is taking too long
- One-time upload needed
- Prefer web interface over CLI
- Troubleshooting EAS Submit issues

## Prerequisites

✅ AAB built: `android/app/build/outputs/bundle/release/app-release.aab`  
✅ Google Play Developer account: insite.tech.ltd@gmail.com  
✅ App created in Play Console (or ready to create)

## Step-by-Step Manual Upload

### Step 1: Access Play Console

1. Go to: https://play.google.com/console
2. Sign in with: **insite.tech.ltd@gmail.com**
3. Select your app: **Taskr** (or create new app)

### Step 2: Navigate to Release Section

1. In left sidebar, click **Release** → **Production** (or **Testing** → **Internal testing**)
2. You'll see the release dashboard

### Step 3: Create New Release

1. Click **Create new release** button
2. A form will open for the new release

### Step 4: Upload AAB

1. In the **App bundles** section, click **Upload**
2. Navigate to your AAB file:
   ```
   /Volumes/KooDrive/Insite App/android/app/build/outputs/bundle/release/app-release.aab
   ```
3. Select `app-release.aab`
4. Click **Open**
5. Wait for upload to complete (may take a few minutes for 53MB file)

### Step 5: Add Release Notes

1. Scroll down to **Release notes**
2. Add notes for this version (e.g., "Version 1.1.2 - Bug fixes and improvements")
3. You can add notes in multiple languages if needed

### Step 6: Review Release

1. Review the release information:
   - Version code: Should match your build
   - Version name: Should match (1.1.2)
   - App bundle: Should show uploaded AAB
2. Check for any warnings or errors

### Step 7: Save and Review

1. Click **Save** (draft) or **Review release**
2. If clicking **Review release**, you'll see a review page

### Step 8: Start Rollout (Production) or Publish (Testing)

**For Production**:
1. Click **Start rollout to Production**
2. Choose rollout percentage:
   - **Staged rollout**: Start with 1%, 5%, 20%, 50%, 100%
   - **Full rollout**: 100% immediately
3. Click **Confirm**

**For Internal/Alpha/Beta Testing**:
1. Click **Review release**
2. Click **Start rollout to [track name]**
3. Confirm

### Step 9: Monitor Release

1. Go back to **Release** dashboard
2. You'll see your release status:
   - **Draft**: Not published yet
   - **In review**: Google is reviewing
   - **Rolling out**: Available to users
   - **Rolled out**: 100% available

## First-Time App Setup

If this is your first release, complete these first:

### 1. App Details

- **App name**: Taskr
- **Default language**: English (or your preference)
- **App or game**: App
- **Free or paid**: Free

### 2. Store Listing

- **App name**: Taskr
- **Short description**: (max 80 characters)
- **Full description**: (max 4000 characters)
- **App icon**: Upload 512x512 PNG
- **Feature graphic**: Upload 1024x500 PNG
- **Screenshots**: At least 2 required
- **Privacy policy URL**: Required

### 3. Content Rating

1. Go to **Policy** → **App content**
2. Complete content rating questionnaire
3. Get rating certificate

### 4. Data Safety

1. Go to **Policy** → **Data safety**
2. Declare data collection practices
3. Explain data usage

## Release Tracks

### Internal Testing
- **Fastest**: Usually available within hours
- **Limited**: Up to 100 testers
- **Use for**: Quick testing, internal QA

### Alpha Testing
- **Fast**: Available within 1-2 days
- **Flexible**: Open or closed testing
- **Use for**: Early beta testing

### Beta Testing
- **Moderate**: Available within 2-3 days
- **Public or closed**: Your choice
- **Use for**: Public beta, wider testing

### Production
- **Review time**: 1-7 days (first release longer)
- **Public**: Available to all users
- **Use for**: Public release

## Version Management

### Version Code
- Must be unique and incrementing
- Current: Check in `android/app/build.gradle` (versionCode)
- Each upload must have higher version code

### Version Name
- User-visible version
- Current: 1.1.2 (from app.json)
- Can repeat across releases (but version code must increase)

## Troubleshooting

### "Version code already exists"

**Solution**: Increment version code in `android/app/build.gradle`:
```gradle
versionCode 13  // Increment from current value
```
Then rebuild AAB.

### "AAB file too large"

**Solution**: 
- Current AAB is 53MB (within 150MB limit)
- If larger, consider:
  - Enable ProGuard/R8
  - Remove unused resources
  - Use App Bundle (already using)

### "Upload failed"

**Solutions**:
- Check internet connection
- Try different browser
- Clear browser cache
- Try incognito mode
- Check file isn't corrupted

### "App not eligible"

**Check**:
- All required fields completed
- Content rating done
- Privacy policy added
- Data safety completed

## Quick Upload Checklist

Before uploading:

- [ ] AAB built successfully
- [ ] Version code incremented (if needed)
- [ ] Version name matches app.json
- [ ] App exists in Play Console
- [ ] Store listing completed (first release)
- [ ] Content rating done (first release)
- [ ] Privacy policy URL added
- [ ] Release notes prepared

## File Locations

**AAB File**:
```
/Volumes/KooDrive/Insite App/android/app/build/outputs/bundle/release/app-release.aab
```

**Play Console**:
```
https://play.google.com/console
```

## Comparison: EAS vs Manual

| Feature | EAS Submit | Manual Upload |
|---------|------------|---------------|
| Speed | Fast (automated) | Moderate (manual steps) |
| Setup | Requires service account | No setup needed |
| Automation | Yes (CI/CD ready) | No |
| First time | More setup | Easier |
| Future releases | Faster | Same effort each time |

## Recommendation

- **First release**: Manual upload (easier setup)
- **Future releases**: EAS Submit (faster, automated)

---

**Google Account**: insite.tech.ltd@gmail.com  
**Package Name**: com.buildtrack.app  
**AAB Location**: android/app/build/outputs/bundle/release/app-release.aab




