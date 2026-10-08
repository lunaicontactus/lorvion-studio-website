#!/usr/bin/env bash
# Every URL the outside world links to (the LUNAI app, store reviewers, search)
# must be in the build that ships. Run on the verified build and again on the
# artifact the deploy downloads (.github/workflows/deploy-pages.yml).
set -euo pipefail
dir="${1:-dist}"
for f in index.html privacy.html terms.html support.html \
         account-deletion.html community-guidelines.html 404.html \
         robots.txt sitemap.xml manifest.webmanifest \
         apple-touch-icon.png CNAME .nojekyll; do
  if [ ! -f "$dir/$f" ]; then
    echo "::error::$dir/$f is missing — a published URL would 404"
    exit 1
  fi
done
echo "All frozen URLs present in $dir."
