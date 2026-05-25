#!/usr/bin/env bash
# Verify, commit and push the O2 demo package.
set -euo pipefail

cd "$(dirname "$0")/.."

COMMIT_MESSAGE="${1:-Finalize O2 POC demo package}"
BACKEND_URL="https://script.google.com/macros/s/AKfycbx3QE-JVcP1dSmnqcy6LUbQhMboZ9MbNf_LlRzrinVzBJXuDOXYNMSvM3KKgk15wiDycw/exec"

echo "==> JavaScript syntax checks"
node --check assets/demo-runtime.js
node --check scripts/build-workbook.mjs

echo "==> Backend health"
curl -fsSL "${BACKEND_URL}?action=state" >/dev/null

echo "==> Staging demo files"
git add \
  index.html \
  assets/demo-runtime.js \
  assets/icon.svg \
  apps-script/Code.gs \
  sw.js \
  README.md \
  docs \
  scripts/publish.sh \
  data/o2_operational_seed.xlsx \
  manifest.webmanifest

echo "==> Staged diff"
git diff --cached --stat

echo "==> Commit"
git commit -m "${COMMIT_MESSAGE}"

echo "==> Push"
git push origin main

echo "Published:"
echo "  https://giqciklum.github.io/o2-poc/"
echo "  https://giqciklum.github.io/o2-poc/?mode=present"
