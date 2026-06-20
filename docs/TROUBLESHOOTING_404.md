# Troubleshooting GitHub Pages 404 Error

## Common Causes

### 1. Files Not Committed/Pushed

The 404 error usually means the files haven't been pushed to GitHub yet.

**Check if files are committed:**
```bash
git status docs/
```

**If files show as untracked or modified:**
```bash
# Add and commit the files
git add docs/support.html docs/GITHUB_PAGES_SETUP.md
git commit -m "Add support page for App Store submission"
git push origin main
```

### 2. GitHub Pages Not Enabled

Even if files are pushed, GitHub Pages must be enabled in repository settings.

**To enable:**
1. Go to: https://github.com/insitetechltd/buildtrack/settings/pages
2. Under "Source":
   - Select: **Deploy from a branch**
   - Branch: **main** (or **master**)
   - Folder: **/docs**
3. Click **Save**

### 3. Wrong Branch

Make sure you're pushing to the correct branch (usually `main` or `master`).

**Check current branch:**
```bash
git branch
```

**Switch to main if needed:**
```bash
git checkout main
```

### 4. Wrong Folder Structure

The file must be at: `docs/support.html` (not `doc/support.html` or `support.html`)

**Verify structure:**
```bash
ls -la docs/support.html
```

### 5. Deployment Delay

GitHub Pages can take 1-5 minutes to deploy after enabling.

**Check deployment status:**
- Go to: https://github.com/insitetechltd/buildtrack/settings/pages
- Look for "Your site is live at..." message
- Check deployment status (should show green checkmark)

## Quick Fix Steps

### Step 1: Verify Files Exist Locally
```bash
cd "/Volumes/KooDrive/Insite App"
ls -la docs/support.html
```

### Step 2: Commit and Push
```bash
git add docs/support.html docs/GITHUB_PAGES_SETUP.md
git commit -m "Add support page for App Store submission"
git push origin main
```

### Step 3: Enable GitHub Pages
1. Visit: https://github.com/insitetechltd/buildtrack/settings/pages
2. Select branch: **main**
3. Select folder: **/docs**
4. Click **Save**

### Step 4: Wait and Verify
- Wait 1-2 minutes
- Visit: https://insitetechltd.github.io/buildtrack/support.html
- If still 404, check deployment status in Settings → Pages

## Alternative: Use index.html

If you want the support page to be the default page:

1. **Rename or copy:**
```bash
cp docs/support.html docs/index.html
git add docs/index.html
git commit -m "Add index page for GitHub Pages"
git push origin main
```

2. **Then access at:**
```
https://insitetechltd.github.io/buildtrack/
```

## Verify Deployment

**Check if GitHub Pages is enabled:**
- Go to repository Settings → Pages
- Should show: "Your site is live at https://insitetechltd.github.io/buildtrack/"

**Check deployment logs:**
- In Settings → Pages, scroll down to see deployment history
- Look for successful deployments (green checkmarks)

**Test the URL:**
- After enabling, wait 1-2 minutes
- Visit: https://insitetechltd.github.io/buildtrack/support.html
- Should show the support page (not 404)

## Still Getting 404?

1. **Double-check the URL:**
   - Correct: `https://insitetechltd.github.io/buildtrack/support.html`
   - Wrong: `https://insitetechltd.github.io/buildtrack/docs/support.html`

2. **Check file permissions:**
   - Make sure files are readable
   - GitHub Pages serves files from the selected folder root

3. **Clear browser cache:**
   - Try incognito/private mode
   - Or add `?v=2` to URL: `https://insitetechltd.github.io/buildtrack/support.html?v=2`

4. **Check repository visibility:**
   - If repository is private, you need GitHub Pro/Team/Enterprise
   - Public repositories get free GitHub Pages

## Expected Result

After successful setup, visiting:
```
https://insitetechltd.github.io/buildtrack/support.html
```

Should show:
- Taskr Support header
- Contact information
- FAQ section
- App information
- Privacy policy links

Not a 404 error page.

