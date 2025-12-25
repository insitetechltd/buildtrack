# EAS Submit to Google Play Store Guide

## Prerequisites

✅ AAB built: `android/app/build/outputs/bundle/release/app-release.aab` (53MB)  
✅ EAS CLI installed and logged in  
✅ Google Play Developer account: insite.tech.ltd@gmail.com

## Option 1: Interactive Submit (Easiest - Recommended for First Time)

This method uses your Google account credentials interactively.

### Step 1: Submit the AAB

```bash
# Submit to Play Store (interactive mode)
eas submit --platform android --latest

# Or specify the AAB file directly
eas submit --platform android --path android/app/build/outputs/bundle/release/app-release.aab
```

### Step 2: Follow the Prompts

EAS will:
1. Ask you to authenticate with Google
2. Open a browser for OAuth login
3. Select your app in Play Console
4. Choose the release track (internal, alpha, beta, production)
5. Submit the AAB

## Option 2: Service Account (Automated - For CI/CD)

This method uses a service account JSON key for automation.

### Step 1: Create Google Play Service Account

1. Go to [Google Play Console](https://play.google.com/console)
2. Navigate to **Setup** → **API access**
3. Click **Create new service account**
4. Follow the link to Google Cloud Console
5. Create a new service account:
   - Name: `eas-submit-service`
   - Role: **Editor** (or custom role with Play Console access)
6. Create a JSON key and download it
7. Go back to Play Console → **API access**
8. Grant the service account access:
   - Click **Grant access** next to your service account
   - Select your app
   - Grant **Release apps to production** permission

### Step 2: Save Service Account Key

```bash
# Save the downloaded JSON key
cp ~/Downloads/your-service-account-key.json ./google-service-account.json

# Add to .gitignore (IMPORTANT!)
echo "google-service-account.json" >> .gitignore
```

### Step 3: Update eas.json

The configuration is already updated in `eas.json`:

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

### Step 4: Submit

```bash
# Submit using service account
eas submit --platform android --profile production --latest
```

## Submit Tracks

Choose the appropriate track:

- **internal**: Internal testing (fastest, limited testers)
- **alpha**: Alpha testing (closed testing)
- **beta**: Beta testing (open or closed)
- **production**: Production release (public)

Update `eas.json` to change the track:

```json
"track": "internal"  // or "alpha", "beta", "production"
```

## Quick Submit Commands

### Submit Latest AAB (Interactive)
```bash
eas submit --platform android --latest
```

### Submit Specific AAB File
```bash
eas submit --platform android --path android/app/build/outputs/bundle/release/app-release.aab
```

### Submit with Profile
```bash
eas submit --platform android --profile production
```

### Submit to Specific Track
```bash
eas submit --platform android --track internal --latest
```

## First-Time Setup Checklist

Before first submission:

- [ ] App created in Google Play Console
- [ ] App details filled (name, description, screenshots)
- [ ] Content rating completed
- [ ] Privacy policy URL added
- [ ] AAB built and tested locally
- [ ] Version code incremented (if needed)

## Troubleshooting

### "App not found in Play Console"

**Solution**: Create the app in Play Console first:
1. Go to [Play Console](https://play.google.com/console)
2. Click **Create app**
3. Fill in app details
4. Complete store listing

### "Service account not authorized"

**Solution**: 
1. Check service account has access in Play Console
2. Verify JSON key is correct
3. Ensure service account has proper permissions

### "Version code already exists"

**Solution**: Increment version code:
```bash
# Edit android/app/build.gradle
versionCode 13  # Increment from current value
```

### "AAB not found"

**Solution**: Build the AAB first:
```bash
cd android
./gradlew bundleRelease
cd ..
```

## Verification

After submission:

1. Check Play Console → **Release** → **Production** (or your track)
2. Verify the AAB is uploaded
3. Check version code and version name
4. Review release notes (if added)

## Next Steps After Submission

1. **Review in Play Console**: Check the uploaded AAB
2. **Add Release Notes**: Describe what's new
3. **Review and Rollout**: Start rollout (internal/beta) or publish (production)
4. **Monitor**: Check for any issues or rejections

## Important Notes

- **Version Code**: Must be unique and incrementing
- **Version Name**: User-visible version (can repeat)
- **First Submission**: Must go through review process
- **Updates**: Usually faster review for updates
- **Rollout**: Can do staged rollout (1%, 5%, 50%, 100%)

## Resources

- [EAS Submit Documentation](https://docs.expo.dev/submit/introduction/)
- [Google Play Console](https://play.google.com/console)
- [Play Store Policies](https://play.google.com/about/developer-content-policy/)

---

**Google Developer Account**: insite.tech.ltd@gmail.com  
**Package Name**: com.buildtrack.app  
**AAB Location**: android/app/build/outputs/bundle/release/app-release.aab




