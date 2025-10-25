# 🔧 Expo Go vs Local Version - Different Results

## 🚨 Problem

You're seeing different data in:
- **Expo Go**: Using published EAS Update
- **Local Dev**: Using development server on port 8081

This is happening because they may be:
1. Running different code versions
2. Using different cache states
3. Connected to different servers

---

## 🎯 Quick Fix Steps

### Option 1: Make Expo Go Use Local Dev Server (Recommended)

**Steps**:
1. **Stop Expo Go** (force quit the app)
2. **In your local dev server**, you should see a QR code
3. **Scan the QR code** with Expo Go
4. This will connect Expo Go to your LOCAL dev server (not EAS Update)

**How to verify**:
- You should see the connection URL: `exp://192.168.x.x:8081`
- The app should reload from your local machine
- Changes you make locally will appear in Expo Go

---

### Option 2: Force Fresh EAS Update

If you want to use the published EAS Update instead:

**Steps**:
1. **Increment app version** to force cache clear:
   ```javascript
   // App.tsx
   const APP_VERSION = "14.0"; // Change from 13.0
   ```

2. **Publish new update**:
   ```bash
   bash scripts/publish-to-expo.sh "Force refresh - v14.0"
   ```

3. **In Expo Go**:
   - Force quit Expo Go
   - Reopen Expo Go
   - Pull down to refresh
   - Should download new update

---

## 🔍 How to Tell Which Version You're Running

### Check the Connection

**Expo Go (EAS Update)**:
- Look for: "Updates" or "Loaded from EAS"
- Connection: No local IP shown
- Code: From published EAS bundle

**Expo Go (Local Dev)**:
- Look for: `exp://192.168.x.x:8081`
- Connection: Shows your local IP
- Code: From your development server
- Fast Refresh enabled

---

## 📱 Recommended Workflow

### For Development (Testing Changes)
✅ **Use Local Dev Server**:
```bash
npx expo start --clear
# Scan QR code in Expo Go
```

**Benefits**:
- Instant code updates (Fast Refresh)
- See console logs
- Debug easily
- Test changes immediately

### For Production Testing (Real Environment)
✅ **Use Published EAS Update**:
```bash
bash scripts/publish-to-expo.sh
# Pull down in Expo Go to refresh
```

**Benefits**:
- Tests production-like environment
- Tests update system
- Tests on real build
- No dev server needed

---

## 🐛 Common Issues & Solutions

### Issue 1: Expo Go Shows Old Data

**Cause**: Using cached EAS Update

**Fix**:
```bash
# 1. Bump version
# Edit App.tsx → APP_VERSION = "14.0"

# 2. Publish
bash scripts/publish-to-expo.sh

# 3. Force quit Expo Go
# 4. Reopen and pull to refresh
```

### Issue 2: Can't Connect to Local Dev

**Cause**: Expo Go trying to use EAS Update

**Fix**:
```bash
# 1. Stop everything
# 2. Start fresh dev server
npx expo start --clear

# 3. In Expo Go:
#    - Go to "Recently in development"
#    - Delete old BuildTrack entries
#    - Scan new QR code
```

### Issue 3: Data Out of Sync

**Cause**: Different database states or cache

**Fix**:
```bash
# 1. Clear AsyncStorage
# Increment APP_VERSION in App.tsx

# 2. Restart app
# This will clear all local data and fetch fresh from Supabase
```

---

## 🎯 Current Situation Analysis

### What You're Seeing

**Expo Go** (First screenshot):
- Shows "EAS" indicator → Using published update
- My Tasks: 4
- Inbox: 5
- Outbox: 0

**Local Version** (Second screenshot):
- Shows "Local" and "Cloud" indicators
- My Tasks: 5 (different!)
- Inbox: 5 (same total, different breakdown)
- Outbox: 2 (different!)

### Why They're Different

1. **Code Version**:
   - Expo Go: Running code from last publish
   - Local: Running current code on your machine

2. **Data State**:
   - Both connect to same Supabase database
   - But may have different cache states
   - Or fetched data at different times

3. **Environment**:
   - Different environment variables?
   - Different build configurations?

---

## ✅ Recommended Action

To make them show the same data:

### Quick Test (5 minutes):
```bash
# 1. Connect Expo Go to LOCAL dev server
npx expo start --clear
# Scan QR code in Expo Go

# 2. Both should now show same data
# (they're running the same code against same database)
```

### Production Deploy (if ready):
```bash
# 1. Bump version
# App.tsx → APP_VERSION = "14.0"

# 2. Commit changes
git add -A
git commit -m "chore: Bump version to 14.0"
git push

# 3. Publish
bash scripts/publish-to-expo.sh "v14.0 - File migration updates"

# 4. Test in Expo Go
# Pull down to refresh
```

---

## 📊 Debug Checklist

- [ ] Check which version Expo Go is using (EAS vs Local)
- [ ] Verify both connect to same Supabase project
- [ ] Clear Expo Go cache (force quit + reopen)
- [ ] Check APP_VERSION matches (App.tsx)
- [ ] Verify EAS Update was published successfully
- [ ] Test with fresh Expo Go connection

---

## 💡 Pro Tip

Add version indicator to your dashboard to see which version is running:

```javascript
// In DashboardScreen.tsx
<Text className="text-xs text-gray-400">
  v{APP_VERSION} - {__DEV__ ? 'DEV' : 'PROD'}
</Text>
```

This helps you know immediately if you're on local or published version!

---

Need help with any of these steps? Let me know!

