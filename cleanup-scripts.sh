#!/bin/bash

# BuildTrack - Cleanup Old Build Scripts and Files
# This script archives old/obsolete scripts and removes old IPA files

set -e

echo "🧹 BuildTrack - Cleanup Old Scripts and Files"
echo "=============================================="
echo ""

# Ask for confirmation
echo "This script will:"
echo "  1. Archive old build scripts to archive/old-scripts/"
echo "  2. Move old IPA files to archive/old-builds/"
echo "  3. Rename working scripts to standard names"
echo "  4. Update .gitignore"
echo ""
read -p "Continue with cleanup? (y/N): " CONFIRM

if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
    echo "Cleanup cancelled."
    exit 0
fi

echo ""
echo "Starting cleanup..."
echo ""

# Step 1: Create archive directories
echo "📁 Creating archive directories..."
mkdir -p archive/old-scripts
mkdir -p archive/old-builds
echo "✅ Created archive directories"
echo ""

# Step 2: Archive old scripts
echo "📦 Archiving old build scripts..."

if [ -f "build-local.sh" ]; then
    mv build-local.sh archive/old-scripts/build-local-OLD.sh
    echo "  ✅ Archived: build-local.sh"
fi

if [ -f "build-and-submit.sh" ]; then
    mv build-and-submit.sh archive/old-scripts/build-and-submit-OLD.sh
    echo "  ✅ Archived: build-and-submit.sh"
fi

if [ -f "build-and-submit-FIXED.sh" ]; then
    mv build-and-submit-FIXED.sh archive/old-scripts/build-and-submit-FIXED-OLD.sh
    echo "  ✅ Archived: build-and-submit-FIXED.sh"
fi

if [ -f "increment-build.sh" ]; then
    mv increment-build.sh archive/old-scripts/increment-build-OLD.sh
    echo "  ✅ Archived: increment-build.sh"
fi

echo ""

# Step 3: Rename working scripts to standard names
echo "✏️  Renaming working scripts to standard names..."

if [ -f "build-local-FIXED.sh" ]; then
    mv build-local-FIXED.sh build-local.sh
    echo "  ✅ Renamed: build-local-FIXED.sh → build-local.sh"
fi

if [ -f "build-and-submit-REFACTORED.sh" ]; then
    mv build-and-submit-REFACTORED.sh build-and-submit.sh
    echo "  ✅ Renamed: build-and-submit-REFACTORED.sh → build-and-submit.sh"
fi

if [ -f "increment-build-FIXED.sh" ]; then
    mv increment-build-FIXED.sh increment-build.sh
    echo "  ✅ Renamed: increment-build-FIXED.sh → increment-build.sh"
fi

echo ""

# Step 4: Move old IPA files
echo "📦 Moving old IPA files to archive..."
IPA_COUNT=$(ls build-*.ipa 2>/dev/null | wc -l | tr -d ' ')

if [ "$IPA_COUNT" -gt 0 ]; then
    mv build-*.ipa archive/old-builds/ 2>/dev/null || true
    echo "  ✅ Moved $IPA_COUNT IPA files to archive/old-builds/"
else
    echo "  ℹ️  No IPA files found to archive"
fi

echo ""

# Step 5: Update .gitignore
echo "📝 Updating .gitignore..."
if ! grep -q "^archive/" .gitignore 2>/dev/null; then
    echo "archive/" >> .gitignore
    echo "  ✅ Added archive/ to .gitignore"
else
    echo "  ℹ️  archive/ already in .gitignore"
fi

echo ""

# Step 6: Show summary
echo "═══════════════════════════════════════════════════════"
echo "✅ CLEANUP COMPLETE!"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "📊 Summary:"
echo "  ├─ Old scripts archived to: archive/old-scripts/"
echo "  ├─ Old IPA files moved to: archive/old-builds/"
echo "  └─ Working scripts renamed to standard names"
echo ""
echo "📁 Current build scripts:"
echo "  ├─ build-local.sh          (was: build-local-FIXED.sh)"
echo "  ├─ build-and-submit.sh     (was: build-and-submit-REFACTORED.sh)"
echo "  ├─ increment-build.sh      (was: increment-build-FIXED.sh)"
echo "  └─ sync-icons.sh           (unchanged)"
echo ""
echo "💡 Next steps:"
echo "  1. Test the renamed scripts:"
echo "     ./build-local.sh ios production-local"
echo ""
echo "  2. Commit the changes:"
echo "     git add ."
echo "     git commit -m \"Cleanup: Archive old scripts and rename working versions\""
echo ""
echo "  3. If everything works, you can delete the archive directory:"
echo "     rm -rf archive/"
echo ""
echo "  4. Or keep it as backup (it's in .gitignore)"
echo ""
echo "═══════════════════════════════════════════════════════"
echo ""

