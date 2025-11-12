# Version vs Build Number Management

## Quick Answer

**VERSION number (1.1.2)**: ❌ NO SCRIPT INCREMENTS THIS - You must edit manually  
**BUILD number (61)**: ✅ Scripts increment this automatically

---

## What Each Script Does

### 1. `increment-build.sh` (Old)
- ❌ Does NOT increment VERSION (1.1.2)
- ✅ Increments BUILD (61 → 62)
- ⚠️ Uses broken EAS API

### 2. `increment-build-FIXED.sh` (New)
- ❌ Does NOT increment VERSION (1.1.2)
- ✅ Increments BUILD (61 → 62)
- ✅ Uses app.json directly (reliable)

### 3. `build-local.sh`
- ❌ Does NOT increment VERSION
- ⚠️ Claims to increment BUILD (but doesn't work)

### 4. `build-local-FIXED.sh`
- ❌ Does NOT increment VERSION
- ✅ Calls `increment-build-FIXED.sh` to increment BUILD
- ✅ **PROMPTS** you about VERSION (but doesn't change it)

### 5. `build-and-submit.sh`
- ❌ Does NOT increment VERSION
- ⚠️ Claims to increment BUILD (but doesn't work)

### 6. `build-and-submit-FIXED.sh`
- ❌ Does NOT increment VERSION
- ✅ Calls `increment-build-FIXED.sh` to increment BUILD
- ✅ **PROMPTS** you about VERSION (but doesn't change it)

---

## Summary Table

| Script | Increments VERSION? | Increments BUILD? | Prompts About VERSION? |
|--------|---------------------|-------------------|------------------------|
| `increment-build.sh` | ❌ No | ⚠️ Tries (broken) | ❌ No |
| `increment-build-FIXED.sh` | ❌ No | ✅ Yes | ❌ No |
| `build-local.sh` | ❌ No | ⚠️ Tries (broken) | ❌ No |
| `build-local-FIXED.sh` | ❌ No | ✅ Yes (via script) | ✅ Yes |
| `build-and-submit.sh` | ❌ No | ⚠️ Tries (broken) | ❌ No |
| `build-and-submit-FIXED.sh` | ❌ No | ✅ Yes (via script) | ✅ Yes |

---

## How VERSION Number is Managed

### Manual Edit Required

The VERSION number must be **manually edited** in `app.json`:

```json
{
  "expo": {
    "version": "1.1.2"  ← Edit this manually
  }
}
```

### When to Change VERSION

| Change Type | VERSION | BUILD | Example |
|-------------|---------|-------|---------|
| Bug fix only | Keep same | +1 | 1.1.2 (61) → 1.1.2 (62) |
| New features | +0.1.0 | +1 | 1.1.2 (62) → 1.1.3 (63) |
| Major release | +1.0.0 | +1 | 1.1.3 (63) → 2.0.0 (64) |

---

## What the FIXED Scripts Do About VERSION

The FIXED scripts **prompt** you but don't change it:

```bash
./build-and-submit-FIXED.sh ios production

# Output:
❓ Is this a new version with new features?
   - If YES: You should increment the version number (e.g., 1.1.2 → 1.1.3)
   - If NO (bug fix only): Keep version the same

Keep current version 1.1.2? (Y/n):
```

**If you answer "n" (no):**
```
⚠️  Please manually edit app.json to update the version number
   Then run this script again
```

**The script exits and waits for you to manually edit `app.json`**

---

## Complete Workflow

### Scenario 1: Bug Fix (Keep VERSION)

```bash
# 1. Don't edit app.json version (keep 1.1.2)

# 2. Run build script
./build-and-submit-FIXED.sh ios production

# 3. Script prompts:
Keep current version 1.1.2? (Y/n): Y  ← Answer YES

# 4. Script automatically increments BUILD:
Incrementing: 61 → 62

# 5. Result:
Built: Version 1.1.2 (Build 62)
```

### Scenario 2: New Features (Change VERSION)

```bash
# 1. Manually edit app.json:
#    Change "version": "1.1.2" → "1.1.3"

# 2. Run build script
./build-and-submit-FIXED.sh ios production

# 3. Script prompts:
Keep current version 1.1.3? (Y/n): Y  ← Answer YES

# 4. Script automatically increments BUILD:
Incrementing: 62 → 63

# 5. Result:
Built: Version 1.1.3 (Build 63)
```

### Scenario 3: Script Reminds You to Change VERSION

```bash
# 1. Don't edit app.json (still shows 1.1.2)

# 2. Run build script
./build-and-submit-FIXED.sh ios production

# 3. Script prompts:
Keep current version 1.1.2? (Y/n): n  ← Answer NO (you want to change it)

# 4. Script says:
⚠️  Please manually edit app.json to update the version number
   Then run this script again

# 5. Script exits

# 6. You manually edit app.json:
#    Change "version": "1.1.2" → "1.1.3"

# 7. Run script again
./build-and-submit-FIXED.sh ios production

# 8. Now it works with new version
```

---

## Why No Automatic VERSION Increment?

### Reason 1: Semantic Versioning
VERSION numbers follow semantic versioning rules:
- **Major.Minor.Patch** (e.g., 1.1.2)
- Scripts can't decide which part to increment
- Requires human judgment

### Reason 2: Different Increment Types
```
1.1.2 → 1.1.3  (patch - bug fix)
1.1.2 → 1.2.0  (minor - new features)
1.1.2 → 2.0.0  (major - breaking changes)
```

### Reason 3: Marketing Decision
- VERSION is user-facing (App Store)
- Marketing/product decision, not technical
- Should be intentional, not automatic

---

## How BUILD Number is Different

BUILD numbers are simpler:
- Always increment by 1
- Never decrease
- Internal tracking only
- Can be automated

That's why scripts handle BUILD but not VERSION.

---

## Current State

```
app.json:
  "version": "1.1.2"      ← Manual edit required
  "buildNumber": "61"     ← Auto-incremented by scripts

Next build will be:
  Version: 1.1.2          ← Same (unless you edit)
  Build:   62             ← Auto-incremented
  Display: 1.1.2 (62)
```

---

## Quick Reference

### To Change VERSION Number:
1. Open `app.json`
2. Find: `"version": "1.1.2"`
3. Edit to: `"version": "1.1.3"` (or whatever you want)
4. Save file
5. Run build script

### To Change BUILD Number:
1. Just run the build script
2. It automatically increments
3. No manual edit needed

---

## Could We Automate VERSION Increment?

**Technically yes, but it's a bad idea:**

```bash
# We COULD create a script like this:
./increment-version.sh patch  # 1.1.2 → 1.1.3
./increment-version.sh minor  # 1.1.2 → 1.2.0
./increment-version.sh major  # 1.1.2 → 2.0.0
```

**But we don't because:**
- VERSION changes should be intentional
- Requires understanding of changes
- Marketing/product decision
- Easy to make mistakes
- Better to edit manually and review

---

## Best Practice

1. **Before building**, decide:
   - Is this a new version? → Edit `app.json` version
   - Just a rebuild? → Don't edit version

2. **Run build script**:
   - Script prompts about version
   - Script auto-increments build
   - Review what's being built

3. **Verify**:
   - Check output shows correct version/build
   - Confirm before submitting

---

## Summary

**VERSION (1.1.2)**:
- ❌ No script changes this
- ✅ Scripts prompt/remind you
- 📝 Manual edit in `app.json`
- 🧠 Requires human decision

**BUILD (61)**:
- ✅ Scripts auto-increment
- 🤖 Fully automated
- 📈 Always increases by 1
- ⚡ No manual edit needed

