# iOS Version Numbering System Explained

## Two Different Numbers

iOS apps have **TWO** separate numbers that serve different purposes:

### 1. Version Number (Marketing Version)
**Also called**: `CFBundleShortVersionString`, Marketing Version, App Version  
**Format**: `MAJOR.MINOR.PATCH` (e.g., `1.1.2`)  
**User-facing**: ✅ YES - Users see this in the App Store

**Where it's defined**:
```
app.json:
  "version": "1.1.2"

ios/BuildTrack/Info.plist:
  <key>CFBundleShortVersionString</key>
  <string>1.1.2</string>
```

**When to increment**:
- **Major (1.x.x)**: Major redesign, breaking changes
- **Minor (x.1.x)**: New features, significant updates
- **Patch (x.x.2)**: Bug fixes, minor improvements

**Example progression**:
- 1.0.0 → Initial release
- 1.1.0 → Added new features
- 1.1.1 → Bug fixes
- 1.1.2 → More bug fixes ← **CURRENT**

---

### 2. Build Number (Build Version)
**Also called**: `CFBundleVersion`, Build Number  
**Format**: Integer (e.g., `60`, `61`)  
**User-facing**: ❌ NO - Internal tracking only

**Where it's defined**:
```
app.json:
  "ios": {
    "buildNumber": "61"
  }

ios/BuildTrack/Info.plist:
  <key>CFBundleVersion</key>
  <string>61</string>
```

**When to increment**:
- **EVERY TIME** you submit to App Store Connect
- Must always be higher than the previous build
- Can be reset when you increment the major version number

**Example progression**:
- Version 1.1.0 (Build 50)
- Version 1.1.0 (Build 51) ← Resubmitted with fixes
- Version 1.1.1 (Build 52)
- Version 1.1.1 (Build 53) ← Resubmitted with fixes
- Version 1.1.2 (Build 60)
- Version 1.1.2 (Build 61) ← **CURRENT** (resubmitting with bug fix)

---

## Current Configuration

```
Version Number: 1.1.2  ← Marketing version (what users see)
Build Number:   61     ← Internal build (for App Store tracking)
```

**Displayed as**: `1.1.2 (61)` in TestFlight and App Store Connect

---

## Workflow Breakdown

### When You Push OTA Update (EAS Update)
```bash
npx eas update --branch production
```

**What changes**:
- ❌ Version number stays the same (1.1.2)
- ❌ Build number stays the same (61)
- ✅ Only JavaScript bundle is updated

**Users see**: No version change, app updates automatically

---

### When You Build & Submit to App Store
```bash
./build-and-submit.sh ios production
```

**What SHOULD change**:
- ✅ Build number increments (60 → 61)
- ⚠️ Version number: Only if you want (1.1.2 → 1.1.3)

**Process**:
1. **Decide if version should change**:
   - Bug fix only? Keep version same (1.1.2)
   - New features? Increment version (1.1.2 → 1.1.3)

2. **Always increment build number**:
   ```bash
   ./increment-build.sh  # Or manual edit
   ```

3. **Build and submit**:
   ```bash
   ./build-and-submit.sh ios production
   ```

---

## File Locations & What Controls What

### app.json (Source of Truth)
```json
{
  "expo": {
    "version": "1.1.2",           ← Version Number (user-facing)
    "ios": {
      "buildNumber": "61"         ← Build Number (internal)
    }
  }
}
```

### ios/BuildTrack/Info.plist (Generated from app.json)
```xml
<key>CFBundleShortVersionString</key>
<string>1.1.2</string>              ← Version Number

<key>CFBundleVersion</key>
<string>61</string>                 ← Build Number
```

**Note**: `Info.plist` is in `.gitignore` because it's generated during build from `app.json`

---

## Common Scenarios

### Scenario 1: Bug Fix (No New Features)
**What to do**:
- Keep version: 1.1.2
- Increment build: 60 → 61

**Result**: `1.1.2 (61)` ← **CURRENT SITUATION**

### Scenario 2: New Features
**What to do**:
- Increment version: 1.1.2 → 1.1.3
- Increment build: 61 → 62

**Result**: `1.1.3 (62)`

### Scenario 3: OTA Update Only
**What to do**:
- Run `npx eas update`
- Nothing changes in version or build

**Result**: Still shows `1.1.2 (61)` but JavaScript is updated

---

## Quick Reference

| Action | Version | Build | Command |
|--------|---------|-------|---------|
| OTA Update | No change | No change | `npx eas update` |
| Bug Fix Build | No change | +1 | `./build-and-submit.sh` |
| Feature Build | +0.1.0 | +1 | Edit version, then build |
| Major Release | +1.0.0 | Can reset | Edit version, then build |

---

## Current Status

```
App Version:    1.1.2  (What users see in App Store)
Build Number:   61     (Internal tracking for this submission)
Full Display:   1.1.2 (61)
```

**This build contains**: Accept task bug fix (no new features, just fixes)  
**Correct numbering**: ✅ 1.1.2 (61) - Bug fix doesn't require version bump

