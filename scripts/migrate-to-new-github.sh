#!/bin/bash

# Script to migrate BuildTrack to a new GitHub account
# Usage: ./scripts/migrate-to-new-github.sh <new-github-username> <new-repo-name>

set -e

if [ $# -lt 2 ]; then
    echo "Usage: $0 <new-github-username> <new-repo-name>"
    echo "Example: $0 mynewusername buildtrack"
    exit 1
fi

NEW_USERNAME=$1
NEW_REPO_NAME=$2
NEW_REMOTE_URL="https://github.com/${NEW_USERNAME}/${NEW_REPO_NAME}.git"

echo "🚀 Migrating BuildTrack to new GitHub account..."
echo ""
echo "Current remote: $(git remote get-url origin)"
echo "New remote: ${NEW_REMOTE_URL}"
echo ""

# Check if we're on main branch
CURRENT_BRANCH=$(git branch --show-current)
echo "Current branch: ${CURRENT_BRANCH}"

# Confirm before proceeding
read -p "Do you want to proceed? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Migration cancelled."
    exit 1
fi

# Update remote URL
echo ""
echo "📝 Updating git remote..."
git remote set-url origin "${NEW_REMOTE_URL}"

# Verify remote update
echo "✅ Remote updated successfully!"
echo "New remote: $(git remote get-url origin)"
echo ""

# Instructions for pushing
echo "═══════════════════════════════════════════════════════════════"
echo "Next steps:"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "1. Create the repository on GitHub:"
echo "   - Go to https://github.com/new"
echo "   - Repository name: ${NEW_REPO_NAME}"
echo "   - Choose Public or Private"
echo "   - DO NOT initialize with README, .gitignore, or license"
echo "   - Click 'Create repository'"
echo ""
echo "2. Push your code:"
echo "   git push -u origin ${CURRENT_BRANCH}"
echo ""
echo "3. Push all branches (if you have others):"
echo "   git push --all origin"
echo ""
echo "4. Push tags (if you have any):"
echo "   git push --tags origin"
echo ""
echo "═══════════════════════════════════════════════════════════════"

