# Using Draft Release Status

## What Changed

I've updated `eas.json` to use `"releaseStatus": "draft"` to bypass the metadata requirement. This allows you to submit your app as a draft release without completing all the store listing requirements first.

## Current Configuration

In `eas.json`, the Android submit config now includes:
```json
"android": {
  "serviceAccountKeyPath": "./google-service-account.json",
  "track": "internal",
  "releaseStatus": "draft"
}
```

## What This Means

- ✅ **Can submit immediately**: No need to complete store listing, content rating, etc. first
- ✅ **Creates draft release**: Your AAB will be uploaded as a draft release
- ✅ **Test before publishing**: You can review and test the draft before making it live

## Next Steps

### Option 1: Submit as Draft (Now Available)

You can now retry the submission:

```bash
cd "/Volumes/KooDrive/Insite App"
./submit-to-play-store.sh internal
```

Or:
```bash
eas submit --platform android \
  --profile production \
  --path android/app/build/outputs/bundle/release/app-release.aab \
  --non-interactive
```

This will create a **draft release** that you can review and publish later from Play Console.

### Option 2: Complete Metadata (Later)

Once the draft is submitted, you can:

1. **Go to Play Console**: https://play.google.com/console
2. **Review your draft release**: Release → Production → Drafts (or Internal testing → Drafts)
3. **Complete required metadata**:
   - Store listing (description, icon, screenshots)
   - Privacy Policy URL
   - Content Rating
4. **Publish the release** once metadata is complete

## Benefits of Draft Release

- ✅ Submit immediately without completing all requirements
- ✅ Test the submission process
- ✅ Upload AAB to Play Console
- ✅ Complete metadata at your own pace
- ✅ Publish when ready

## When to Remove "draft" Status

Once you've completed the store listing and metadata requirements in Play Console, you can remove `"releaseStatus": "draft"` from `eas.json` to submit directly to tracks:

```json
"android": {
  "serviceAccountKeyPath": "./google-service-account.json",
  "track": "internal"
  // Remove: "releaseStatus": "draft"
}
```

Then future submissions will go directly to the track without creating drafts.

## Retry Submission

You can now retry the submission - it should work with draft release status:

```bash
./submit-to-play-store.sh internal
```

---

**Status**: Draft release configured ✅  
**Next**: Retry submission - it should succeed now!

