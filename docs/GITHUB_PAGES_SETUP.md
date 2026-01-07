# GitHub Pages Setup for Support Page

## Overview

This guide explains how to host the support page on GitHub Pages for App Store submission.

**GitHub Repository**: `https://github.com/insitetechltd/buildtrack.git`

## Quick Setup

### Option 1: Use `docs/` Folder (Recommended)

GitHub Pages can serve files from the `docs/` folder in your repository.

1. **The support page is already created** at `docs/support.html`

2. **Enable GitHub Pages**:
   - Go to your repository: https://github.com/insitetechltd/buildtrack
   - Click **Settings** → **Pages**
   - Under "Source", select **Deploy from a branch**
   - Select **Branch**: `main` (or `master`)
   - Select **Folder**: `/docs`
   - Click **Save**

3. **Your support URL will be**:
   ```
   https://insitetechltd.github.io/buildtrack/support.html
   ```

### Option 2: Use `gh-pages` Branch

If you prefer a separate branch:

```bash
# Create and switch to gh-pages branch
git checkout --orphan gh-pages
git rm -rf .

# Copy support.html to root
cp docs/support.html index.html

# Commit and push
git add index.html
git commit -m "Add support page"
git push origin gh-pages
```

Then in GitHub Settings → Pages, select `gh-pages` branch.

## Steps to Deploy

### 1. Commit the Support Page

```bash
cd "/Volumes/KooDrive/Insite App"

# Add the docs folder
git add docs/support.html
git commit -m "Add support page for App Store submission"
git push origin main
```

### 2. Enable GitHub Pages

1. Go to: https://github.com/insitetechltd/buildtrack/settings/pages
2. Under "Source":
   - Select: **Deploy from a branch**
   - Branch: **main** (or **master**)
   - Folder: **/docs**
3. Click **Save**

### 3. Wait for Deployment

- GitHub Pages typically takes 1-2 minutes to deploy
- You'll see a green checkmark when it's live
- The URL will be shown on the Pages settings page

### 4. Verify the Page

Visit: `https://insitetechltd.github.io/buildtrack/support.html`

You should see the support page with:
- Contact information
- FAQ section
- App information
- Privacy policy links

## Using in App Store Connect

1. **Go to App Store Connect**: https://appstoreconnect.apple.com
2. **Select your app** (Taskr)
3. **Go to**: App Information → Support URL
4. **Enter**: `https://insitetechltd.github.io/buildtrack/support.html`
5. **Save**

## Custom Domain (Optional)

If you want to use a custom domain (e.g., `support.insiteworks.com`):

1. **Add CNAME file** in `docs/` folder:
   ```
   support.insiteworks.com
   ```

2. **Configure DNS**:
   - Add a CNAME record pointing to `insitetechltd.github.io`

3. **Update GitHub Pages settings**:
   - In Settings → Pages, add your custom domain

## Additional Pages

You can create additional pages in the `docs/` folder:

- `docs/privacy-policy.html` - Privacy Policy
- `docs/terms-of-service.html` - Terms of Service
- `docs/index.html` - Landing page (optional)

These will be accessible at:
- `https://insitetechltd.github.io/buildtrack/privacy-policy.html`
- `https://insitetechltd.github.io/buildtrack/terms-of-service.html`

## Troubleshooting

### Page Not Loading

1. **Check deployment status**:
   - Go to Settings → Pages
   - Look for deployment status
   - Check for any errors

2. **Verify file location**:
   - File should be at `docs/support.html` in the repository
   - Check that it's committed and pushed

3. **Clear cache**:
   - GitHub Pages may cache pages
   - Wait a few minutes and try again
   - Or add `?v=2` to the URL to force refresh

### 404 Error

- Make sure the file is named correctly: `support.html`
- Check that GitHub Pages is enabled
- Verify the branch and folder settings

### Custom Domain Not Working

- Verify DNS CNAME record is correct
- Check that CNAME file is in the `docs/` folder
- Wait for DNS propagation (can take up to 48 hours)

## Testing Locally

You can test the support page locally before deploying:

```bash
# Using Python
cd docs
python3 -m http.server 8000

# Or using Node.js
npx http-server docs -p 8000
```

Then visit: `http://localhost:8000/support.html`

## Maintenance

- **Update contact information**: Edit `docs/support.html`
- **Add new FAQs**: Add to the FAQ section in `support.html`
- **Update app version**: Update the version number in the App Information section

## Summary

✅ **Support page created**: `docs/support.html`
✅ **Ready to deploy**: Just commit and push
✅ **GitHub Pages URL**: `https://insitetechltd.github.io/buildtrack/support.html`
✅ **App Store ready**: Use this URL in App Store Connect

The support page includes:
- Contact information
- FAQ section
- App information
- Privacy policy links
- Issue reporting instructions

