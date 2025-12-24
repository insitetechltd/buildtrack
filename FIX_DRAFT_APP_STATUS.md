# Fix "Only releases with status draft may be created on draft app" Error

## The Problem

Your app is in **"draft"** status in Google Play Console. Draft apps can only create draft releases, not releases to tracks (internal/alpha/beta/production).

## Solution: Complete App Setup in Play Console

You need to complete the initial app setup in Play Console to move it out of draft status. Here's what's required:

### Step 1: Go to Play Console

1. Go to: https://play.google.com/console
2. Sign in with: **insite.tech.ltd@gmail.com**
3. Select your app: **Taskr**

### Step 2: Check App Status

Look at the left sidebar - you should see what's missing. Common requirements:

### Step 3: Complete Required Sections

#### ✅ **1. Store Listing (Required)**
- Navigate to: **Store presence** → **Main store listing**
- **Required fields**:
  - ✅ App name: **Taskr**
  - ✅ Short description (max 80 characters)
  - ✅ Full description (max 4000 characters)
  - ✅ App icon (512x512 PNG, no transparency)
  - ✅ Feature graphic (1024x500 PNG) - Optional but recommended
  - ✅ At least 2 screenshots (phone screenshots)

#### ✅ **2. Privacy Policy (Required for apps with sensitive permissions)**
- Navigate to: **Policy** → **App content** → **Privacy Policy**
- Add your privacy policy URL
- See `HOST_PRIVACY_POLICY_GOOGLE.md` for how to create one

#### ✅ **3. Content Rating (Required)**
- Navigate to: **Policy** → **App content** → **Content rating**
- Click **Start questionnaire**
- Answer questions about your app's content
- Submit to get rating (IARC, ESRB, etc.)
- This can take a few minutes to process

#### ✅ **4. Target Audience & Content (Required)**
- Navigate to: **Policy** → **App content**
- Set target audience (e.g., "Everyone", "Teen", etc.)
- Complete content questionnaire

#### ✅ **5. Data Safety (Required)**
- Navigate to: **Policy** → **Data safety**
- Declare data collection practices:
  - Personal info (names, emails)
  - Photos and videos (camera access)
  - Device/app history
- Explain how data is used
- Declare data sharing (Supabase, etc.)

### Step 4: Publish Initial Draft Release

Once all required sections are complete:

1. **Go to**: **Release** → **Production** (or **Internal testing**)
2. **Create a release**:
   - Upload your AAB: `android/app/build/outputs/bundle/release/app-release.aab`
   - Add release notes (optional for first release)
   - **Save as draft** first
3. **Review**:
   - Play Console will show any remaining issues
   - Fix any validation errors
4. **Submit for review** (if going to Production) or **Publish** (if Internal testing)

### Alternative: Use Draft Release Method

If you want to test without completing all store listing requirements:

1. **Go to**: **Release** → **Production** → **Drafts**
2. **Create draft release**:
   - Upload your AAB
   - Save as draft
   - You can test the draft without publishing

However, to move out of draft status and use tracks properly, you'll eventually need to complete the store listing.

## Quick Checklist

Before submitting to a track, ensure:

- [ ] **Store listing**: App name, description, icon, screenshots added
- [ ] **Privacy Policy**: URL added in Policy → App content
- [ ] **Content Rating**: Questionnaire completed and rating obtained
- [ ] **Data Safety**: Data collection practices declared
- [ ] **App status**: No longer shows as "Draft" in Play Console

## Common Issues

### "App is in draft status"

**Solution**: Complete the required sections above, especially:
1. Store listing (at minimum: name, description, icon, 2 screenshots)
2. Privacy Policy URL
3. Content Rating questionnaire

### "Can't find where to add privacy policy"

**Solution**: 
- Navigate: Play Console → **Taskr** → **Policy** → **App content** → **Privacy Policy**
- Or direct link: https://play.google.com/console/u/0/developers/~/app/[APP_ID]/app-content

### "Content rating pending"

**Solution**: 
- Complete the content rating questionnaire
- Wait 5-10 minutes for processing
- Refresh the page

## After Completing Setup

Once all required sections are complete and the app is no longer in draft:

1. **Retry submission**:
   ```bash
   cd "/Volumes/KooDrive/Insite App"
   ./submit-to-play-store.sh internal
   ```

2. **Or use EAS directly**:
   ```bash
   eas submit --platform android \
     --profile production \
     --path android/app/build/outputs/bundle/release/app-release.aab \
     --non-interactive
   ```

## Minimum Required for First Release

To move out of draft quickly, at minimum you need:

1. ✅ **Store listing basics**:
   - App name
   - Short description
   - App icon
   - 2 screenshots

2. ✅ **Privacy Policy URL**

3. ✅ **Content Rating** (complete questionnaire)

Once these are done, the app should move out of draft status and you can submit to tracks.

---

**Next Steps**: Complete the store listing and privacy policy, then retry the submission!

