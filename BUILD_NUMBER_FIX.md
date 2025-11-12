# Build Number Fix - App Store Submission

## Issue
When attempting to submit the iOS app to App Store Connect, the submission failed with the following error:

```
[Application Loader Error Output]: The provided entity includes an attribute with a value that has already been used 
The bundle version must be higher than the previously uploaded version: '60'. (ID: 9eb21bf6-4d36-4fc5-bc0b-ee2c1dad1da8)
```

## Root Cause
The build number in the app configuration was not properly synchronized with the last build submitted to App Store Connect. Build number 60 had already been used, so the new submission was rejected.

## Solution
Manually incremented the build number to **61** (one higher than the rejected build 60):

### Files Updated:
1. **app.json**
   - Changed `"buildNumber": "2"` → `"buildNumber": "61"`
   
2. **ios/BuildTrack/Info.plist**
   - Changed `CFBundleVersion` from `2` → `61`
   - Changed `CFBundleShortVersionString` from `1.1.2` → `1.1.3`

## Build Configuration
- **App Version**: 1.1.3
- **Build Number**: 61
- **Platform**: iOS
- **Profile**: production

## Next Steps
Run the build and submit script again:

```bash
./build-and-submit.sh ios production
```

The build should now be accepted by App Store Connect since the build number (61) is higher than the previously uploaded version (60).

## Notes
- The `ios` folder is in `.gitignore`, so only `app.json` changes are committed to git
- The `Info.plist` will be regenerated during the build process with the correct build number from `app.json`
- EAS auto-increment is configured but wasn't working correctly in this case, so manual increment was necessary

## Prevention
For future builds, ensure that:
1. Check the last build number in App Store Connect before building
2. Use the `increment-build.sh` script, but verify it's pulling the correct last build number
3. If auto-increment fails, manually set the build number to be higher than the last submitted build

## Related Documentation
- App Store Connect: https://appstoreconnect.apple.com
- EAS Build Documentation: https://docs.expo.dev/build/introduction/

