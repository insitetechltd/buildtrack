# Performance Optimization Guide

Tips for optimal development performance, especially when dealing with cloud sync services.

## Current Project Stats

- **Location:** `/Volumes/KooDrive/Insite App` (External Drive)
- **Size Breakdown:**
  - `node_modules/`: ~632 MB
  - `ios/`: ~180 MB
  - Build artifacts: ~20 MB per build

## iCloud Drive & Cloud Sync Issues

### Why Development Projects Slow Down Cloud Services

Development projects contain:
- **632 MB+** in node_modules (thousands of small files)
- **180 MB+** in native iOS/Android folders
- Large binary files (.ipa, .apk)
- Frequent file changes during development

These characteristics cause cloud sync services to:
- Constantly try to sync thousands of files
- Consume CPU/bandwidth indexing changes
- Create sync conflicts
- Slow down file operations

### Solutions Implemented

✅ **Added `.nosync` file** - Signals to cloud services to skip this directory  
✅ **Proper `.gitignore`** - Excludes large/generated files  
✅ **Build artifacts ignored** - .ipa, .apk, .aab files excluded

## Performance Best Practices

### 1. Project Location

**Recommended Order (fastest to slowest):**

1. **Local SSD** (Best)
   ```bash
   ~/Development/BuildTrack
   ```
   - Fastest I/O
   - No network overhead
   - Best for daily development

2. **External SSD** (Good) ✅ *You are here*
   ```bash
   /Volumes/KooDrive/Insite App
   ```
   - Good performance if USB 3.0+
   - Keep drive connected while working
   - Safely eject when done

3. **External HDD** (Slower)
   - Mechanical drives are slower
   - Consider moving to SSD location

4. **Network/Cloud** (Avoid)
   - iCloud Drive, Dropbox, OneDrive
   - **Never** put active dev projects here
   - Extreme slowness guaranteed

### 2. Exclude From Cloud Sync

If you must keep project near cloud-synced locations:

**iCloud Drive:**
```bash
# Add .nosync to directory name
mv "Insite App" "Insite App.nosync"
```

**Dropbox:**
```bash
# Use Dropbox selective sync to exclude folder
# Or add to .dropboxignore
```

**OneDrive:**
```bash
# Right-click folder → "Free up space"
# Or exclude in OneDrive settings
```

### 3. Optimize Build Performance

**Clean Build Artifacts Regularly:**
```bash
# Remove old builds
rm -f *.ipa *.apk *.aab

# Clean iOS build cache
rm -rf ios/build/

# Clean Metro bundler cache
npx expo start --clear
```

**Exclude from Spotlight/Time Machine:**
```bash
# Add to System Settings > Spotlight > Privacy
/Volumes/KooDrive/Insite App/node_modules
/Volumes/KooDrive/Insite App/ios
```

### 4. Monitor Disk Activity

**Check what's using your disk:**
```bash
# Activity Monitor
# View > Window > Disk Activity
# Sort by "Bytes Read" or "Bytes Written"
```

**Common culprits:**
- `cloudd` (iCloud sync)
- `Dropbox`
- `OneDrive`
- `mds_stores` (Spotlight indexing)
- `backupd` (Time Machine)

### 5. Disable Cloud Sync During Development

**Pause iCloud Drive:**
```bash
# System Settings > Apple ID > iCloud
# Toggle off "iCloud Drive" temporarily
# Re-enable after development session
```

**Or exclude specific folders:**
```bash
# System Settings > Apple ID > iCloud > iCloud Drive
# Options > Manage Storage
# Exclude folders
```

## Build Performance Tips

### Use Local Builds for Development

```bash
# Faster: Build locally
./build-local.sh simulator ios

# Slower: Cloud builds (for production only)
npx eas build --platform ios --profile production
```

### Cache Node Modules

```bash
# Use npm ci instead of npm install (faster, uses lockfile)
npm ci --legacy-peer-deps

# Clear npm cache if issues
npm cache clean --force
```

### Parallel Operations

```bash
# Install dependencies while doing other work
npm ci --legacy-peer-deps &
```

## Monitoring Performance

### Check Drive Speed

```bash
# Test read speed
time dd if=/Volumes/KooDrive/test.tmp of=/dev/null bs=1m count=1000

# Test write speed
time dd if=/dev/zero of=/Volumes/KooDrive/test.tmp bs=1m count=1000

# Clean up
rm /Volumes/KooDrive/test.tmp
```

**Expected speeds:**
- SSD: 200-500 MB/s
- HDD: 80-120 MB/s
- USB 2.0: 35 MB/s
- Network: varies wildly

### Check Cloud Sync Status

```bash
# iCloud sync status
brctl log --wait --shorten

# Stop if stuck
killall cloudd
```

## Quick Wins

### Immediate Actions:

1. ✅ **Added `.nosync` file** - Already done
2. **Pause cloud sync during development**
3. **Exclude project from Spotlight**
4. **Clean old build artifacts**

```bash
# Run this now for instant cleanup
cd "/Volumes/KooDrive/Insite App"
rm -f *.ipa *.apk *.aab
rm -rf ios/build/
```

### Long-term Optimization:

1. **Consider moving to local SSD** for daily work
2. **Use external drive for backups only**
3. **Keep cloud sync minimal** - just source code, not builds

## Recommended Workflow

### Daily Development (Fast):
```bash
# Work on local drive
~/Development/BuildTrack/

# Use Git for version control
git commit && git push
```

### Builds & Deployment:
```bash
# Build and deploy from local or external drive
cd ~/Development/BuildTrack
./build-and-submit.sh ios production
```

### Backup Strategy:
```bash
# Regular Git commits (to GitHub/remote)
git commit && git push

# Time Machine for local snapshots
# iCloud for important documents only (not code)
```

## Troubleshooting

### "Operation not permitted" errors
- Check System Settings > Privacy & Security > Full Disk Access
- Grant Terminal/IDE access

### Still slow?
```bash
# 1. Check what processes are using disk
sudo fs_usage | grep "/Volumes/KooDrive"

# 2. Verify drive connection
diskutil info /Volumes/KooDrive | grep "Protocol"

# 3. Test with local copy
cp -r "/Volumes/KooDrive/Insite App" ~/Desktop/BuildTrack-Test
cd ~/Desktop/BuildTrack-Test
npm start
# If faster, drive is the bottleneck
```

### iCloud Drive specific issues
```bash
# Reset iCloud sync
killall cloudd
killall bird

# Check sync status
brctl log --wait --shorten
```

## Summary

**For best performance:**
- ✅ Keep project on external SSD (you're good)
- ✅ Added `.nosync` to prevent cloud sync
- ⚠️ Pause iCloud Drive during development
- ⚠️ Clean build artifacts regularly
- 💡 Consider local SSD for daily work

**Current setup rating: 7/10**
- External drive is fine for project storage
- Just pause cloud sync during builds
- Clean artifacts after builds


