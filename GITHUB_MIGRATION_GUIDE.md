# GitHub Account Migration Guide

This guide will help you migrate BuildTrack to a new GitHub account.

## Step 1: Create a New GitHub Account

1. Go to https://github.com/signup
2. Choose a username (avoid using your suspended account name)
3. Enter your email address
4. Create a password
5. Verify your email address

## Step 2: Set Up Authentication

You'll need to authenticate with GitHub. Choose one method:

### Option A: Personal Access Token (Recommended)
1. Go to https://github.com/settings/tokens
2. Click "Generate new token" → "Generate new token (classic)"
3. Give it a name like "BuildTrack Migration"
4. Select scopes: `repo` (full control of private repositories)
5. Click "Generate token"
6. **Copy the token immediately** (you won't see it again!)

### Option B: SSH Key
1. Generate SSH key: `ssh-keygen -t ed25519 -C "your_email@example.com"`
2. Add to ssh-agent: `eval "$(ssh-agent -s)"` then `ssh-add ~/.ssh/id_ed25519`
3. Copy public key: `cat ~/.ssh/id_ed25519.pub`
4. Add to GitHub: https://github.com/settings/keys → "New SSH key"

## Step 3: Create New Repository

1. Go to https://github.com/new
2. Repository name: `buildtrack` (or your preferred name)
3. Choose Public or Private
4. **Important**: DO NOT initialize with README, .gitignore, or license
5. Click "Create repository"

## Step 4: Migrate Your Code

### Using the Migration Script (Easiest)

```bash
# Make script executable
chmod +x scripts/migrate-to-new-github.sh

# Run migration script
./scripts/migrate-to-new-github.sh <your-new-username> <repository-name>

# Example:
./scripts/migrate-to-new-github.sh mynewusername buildtrack
```

### Manual Migration

```bash
# Update remote URL
git remote set-url origin https://github.com/<new-username>/<repo-name>.git

# Verify remote
git remote -v

# Push main branch
git push -u origin main

# Push all branches (if you have others)
git push --all origin

# Push tags (if you have any)
git push --tags origin
```

## Step 5: Authenticate When Pushing

When you run `git push`, you'll be prompted for credentials:

**If using Personal Access Token:**
- Username: Your GitHub username
- Password: Paste your Personal Access Token (not your GitHub password)

**If using SSH:**
- Make sure you've added your SSH key to GitHub
- Use SSH URL instead: `git remote set-url origin git@github.com:username/repo.git`

## Step 6: Update Environment Variables

If you have any environment variables or CI/CD that reference the old repository:

1. Check `.env` files for GitHub URLs
2. Update any GitHub Actions workflows
3. Update any external services that reference the old repo

## Troubleshooting

### "Repository not found" error
- Make sure the repository exists on GitHub
- Verify your authentication (token or SSH key)
- Check that the repository name and username are correct

### "Permission denied" error
- Verify your Personal Access Token has `repo` scope
- Or ensure your SSH key is added to GitHub

### Need to keep old remote as backup
```bash
# Add old remote as backup
git remote add old-origin https://github.com/insitetechltd/buildtrackapp.git

# View all remotes
git remote -v
```

## Current Repository Info

- **Old Remote**: `https://github.com/insitetechltd/buildtrackapp.git`
- **Current Branch**: Check with `git branch --show-current`

