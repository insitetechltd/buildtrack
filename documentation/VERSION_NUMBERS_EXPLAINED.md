# Version Numbers Explained

Understanding the different version numbers in iOS builds and how they work.

## The Three Numbers

### 1. **Version Number** (Marketing Version)
**Example:** `1.1.2`

- Visible to users in the App Store
- Format: Major.Minor.Patch (semantic versioning)
- Set in `app.json`: `"version": "1.1.2"`
- Maps to `CFBundleShortVersionString` in Info.plist
- **When to change:** When releasing new features or fixes to users

### 2. **Build Number** (CFBundleVersion)
**Example:** `37`, `38`, `39`

- Internal tracking number
- Must be **unique** for every upload to App Store Connect
- Increments with every build
- Set in `ios/BuildTrack/Info.plist`: `<key>CFBundleVersion</key>`
- **This is what causes "already submitted" errors**
- **When to change:** Every single build

### 3. **EAS Build Number**
**Example:** Build #37 on EAS

- Tracked by EAS servers
- Used for EAS internal tracking
- Different from App Store build number (but usually synced)

## How Auto-Increment Works

### Your Configuration (`eas.json`):

```json
"production": {
  "autoIncrement": true,  // ← This is the key setting!
  ...
}
```

**What happens when you build:**

```
1. You run: ./build-and-submit.sh
2. EAS checks the last CFBundleVersion it used
3. EAS increments it automatically (+1)
4. EAS builds with the new number
5. New .ipa has unique CFBundleVersion
6. Submission to App Store Connect succeeds
```

## The "Already Submitted" Error

### What it means:
```
You've already submitted this build of the app.
Builds are identified by CFBundleVersion from Info.plist
```

### Why it happens:
- You're trying to submit an `.ipa` file with a **CFBundleVersion** that's already in App Store Connect
- App Store Connect tracks all submitted build numbers permanently

### Common causes:
1. **Submitting the same build twice** ❌
   ```bash
   ./build-and-submit.sh  # Build #37
   ./build-and-submit.sh  # Still tries to submit Build #37 again
   ```

2. **Building without auto-increment** ❌
   - If `autoIncrement: false`, EAS won't increment
   - Every build gets the same number

3. **Manual builds with duplicate numbers** ❌
   - Building in Xcode with same CFBundleVersion
   - Building locally without incrementing

### How to fix:
✅ **Create a NEW build** (EAS auto-increments)
```bash
./build-and-submit.sh  # Creates Build #38 (new number)
```

## Version Number Flow

### Scenario 1: Normal Build & Submit
```
Current state:
  App Store: Version 1.1.2, Build 36
  Local: Version 1.1.2, Build 36

You run: ./build-and-submit.sh

EAS does:
  1. Reads last build: 36
  2. Increments: 36 → 37
  3. Builds with: Version 1.1.2, Build 37
  4. Submits: Version 1.1.2, Build 37 ✅

Result:
  App Store: Version 1.1.2, Build 37
```

### Scenario 2: Submitting Same Build Twice (ERROR)
```
Current state:
  App Store: Version 1.1.2, Build 37
  Local .ipa: Version 1.1.2, Build 37

You run: npx eas submit --latest

Result:
  ❌ ERROR: "You've already submitted this build"
  
Why: Build 37 is already in App Store Connect
```

### Scenario 3: New Version Release
```
Current state:
  App Store: Version 1.1.2, Build 37

You update app.json:
  "version": "1.2.0"  ← Changed version

You run: ./build-and-submit.sh

EAS does:
  1. Increments build: 37 → 38
  2. Uses new version: 1.2.0
  3. Builds with: Version 1.2.0, Build 38
  4. Submits: Version 1.2.0, Build 38 ✅

Result:
  App Store: Version 1.2.0, Build 38
```

## Where Version Numbers Live

### In Your Project:

**`app.json`:**
```json
{
  "expo": {
    "version": "1.1.2",           // ← Marketing version
    "ios": {
      "buildNumber": "2"          // ← Optional, usually omitted with autoIncrement
    }
  }
}
```

**`ios/BuildTrack/Info.plist`:**
```xml
<key>CFBundleShortVersionString</key>
<string>1.1.2</string>              ← Marketing version

<key>CFBundleVersion</key>
<string>37</string>                 ← Build number (this matters!)
```

**`eas.json`:**
```json
{
  "build": {
    "production": {
      "autoIncrement": true        ← EAS handles incrementing
    }
  }
}
```

## Best Practices

### ✅ DO:
1. **Let EAS auto-increment** (keep `autoIncrement: true`)
2. **Build fresh for every submission** (don't resubmit old builds)
3. **Update version number** when releasing to users
4. **Use `./build-and-submit.sh`** for automated workflow

### ❌ DON'T:
1. **Submit the same .ipa twice** (build fresh instead)
2. **Manually set build numbers** (let EAS handle it)
3. **Disable autoIncrement** (unless you have a specific reason)
4. **Mix manual and EAS builds** (choose one method)

## Troubleshooting

### "Already submitted" error
**Solution:** Create a new build
```bash
./build-and-submit.sh  # Creates new build with new number
```

### Build numbers out of sync
**Check current state:**
```bash
# Check EAS builds
npx eas build:list --limit 5

# Check local Info.plist
/usr/libexec/PlistBuddy -c "Print :CFBundleVersion" ios/BuildTrack/Info.plist

# Check app.json
grep buildNumber app.json
```

### Want to skip a build number
**Use increment script:**
```bash
./increment-build.sh  # Manually bump without building
```

### Reset build numbers (Advanced)
**Not recommended, but possible:**
1. In App Store Connect, you can only increment (never go backwards)
2. For testing, use a different bundle ID
3. Or start a new app entirely

## Quick Reference

| What | Where | Example | Purpose |
|------|-------|---------|---------|
| Version | `app.json` | `1.1.2` | User-facing version |
| Build | `Info.plist` | `37` | Unique build identifier |
| Auto-increment | `eas.json` | `true` | EAS increments automatically |

## Summary

**TL;DR:**
- ✅ **EAS auto-increments** the build number (CFBundleVersion)
- ✅ **Every build gets a NEW number** automatically
- ✅ **Just run `./build-and-submit.sh`** and let EAS handle it
- ❌ **Never submit the same build twice** - build fresh instead
- 🎯 **The build number (CFBundleVersion) is what App Store Connect checks**

**The "already submitted" error means:** That specific build number is already in App Store Connect. Solution: Build again to get a new number.

