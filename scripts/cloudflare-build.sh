#!/usr/bin/env bash
set -euo pipefail

# Cloudflare Pages: set SKIP_DEPENDENCY_INSTALL=1 and use this script as the build command.
# Avoids stale dependency cache breaking `npm ci` on the build image.

npm install
node scripts/generate-fe-environment.mjs
npm run build:sit
