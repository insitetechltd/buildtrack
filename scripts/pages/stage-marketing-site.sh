#!/usr/bin/env bash
# Stage only the public marketing surface for GitHub Pages.
# Repo layout under docs/ is unchanged; this copies an allowlist into OUT_DIR.
#
# Usage:
#   bash scripts/pages/stage-marketing-site.sh
#   OUT_DIR=/tmp/pages-site bash scripts/pages/stage-marketing-site.sh
#
# Allowlist (included):
#   docs/CNAME, docs/.nojekyll
#   docs/index.html, company.css, company.js
#   docs/{signup,privacy-policy,support,terms-of-service,billing}.html  (legacy redirects)
#   docs/taskr/**
#   docs/assets/**            (Insite Works portfolio Keynote export)
#   docs/company-assets/**
#   docs/company-media/**
#   docs/legal/**
#
# Explicitly excluded (must never appear in OUT_DIR):
#   docs/superpowers/**       (plans, evidence, analysis, reports)
#   docs/archive/**
#   docs/simulation-mockups/**
#   docs/i18n/**
#   docs/*.md                 (ops / SoT markdown)
#   documentation/**          (not under docs/; never copied)

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT_DIR="${OUT_DIR:-$ROOT/.cache/pages-site}"

rm -rf "$OUT_DIR"
mkdir -p "$OUT_DIR"

# Never ship markdown (ops notes / asset READMEs) on the public site.
RSYNC_EXCLUDES=(--exclude '*.md' --exclude '*.MD')

copy_path() {
  local rel="$1"
  local src="$ROOT/$rel"
  if [[ ! -e "$src" ]]; then
    echo "WARN: missing $rel (skip)" >&2
    return 0
  fi
  local dest="$OUT_DIR/${rel#docs/}"
  if [[ -d "$src" ]]; then
    mkdir -p "$dest"
    # trailing slash: copy contents into dest
    rsync -a --delete "${RSYNC_EXCLUDES[@]}" "$src"/ "$dest"/
  else
    # Skip individual markdown files if listed
    case "$src" in
      *.md|*.MD)
        echo "SKIP md $rel"
        return 0
        ;;
    esac
    mkdir -p "$(dirname "$dest")"
    rsync -a "$src" "$dest"
  fi
  echo "INCLUDE $rel"
}

# Root Pages markers + company landing
copy_path docs/CNAME
copy_path docs/.nojekyll
copy_path docs/index.html
copy_path docs/company.css
copy_path docs/company.js

# Legacy root redirects into /taskr/
for f in signup.html privacy-policy.html support.html terms-of-service.html billing.html; do
  copy_path "docs/$f"
done

# Public product + portfolio assets
copy_path docs/taskr
copy_path docs/assets
copy_path docs/company-assets
copy_path docs/company-media
copy_path docs/legal

# Fail closed if internal trees leaked into the artifact
FORBIDDEN=(
  superpowers
  archive
  simulation-mockups
  i18n
  GITHUB_PAGES_SETUP.md
  TROUBLESHOOTING_404.md
  INSITE_UI_UX_SOURCE_OF_TRUTH.md
  2026-07-03-insite-redesign-session-handoff.md
)

leak=0
for name in "${FORBIDDEN[@]}"; do
  if [[ -e "$OUT_DIR/$name" ]]; then
    echo "FAIL: forbidden path in artifact: $OUT_DIR/$name" >&2
    leak=1
  fi
done

# Extra sweep: any *.md under artifact root (ops docs must not ship)
while IFS= read -r -d '' md; do
  echo "FAIL: markdown in artifact: $md" >&2
  leak=1
done < <(find "$OUT_DIR" -type f -name '*.md' -print0 2>/dev/null || true)

if [[ "$leak" -ne 0 ]]; then
  exit 1
fi

echo "STAGED ok → $OUT_DIR"
echo "FILE_COUNT=$(find "$OUT_DIR" -type f | wc -l | tr -d ' ')"
# Sample top-level for logs
echo "TOP_LEVEL:"
ls -1 "$OUT_DIR" | sed 's/^/  /'
