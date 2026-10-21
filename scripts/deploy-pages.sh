#!/usr/bin/env bash
# Deploy fe-localgo to Cloudflare Pages project localgo-sit (production).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

export PATH="$HOME/.local/bin:$HOME/.local/node_modules/.bin:$PATH"

if [[ -f "$HOME/.config/localgo/deploy.env" ]]; then
  # shellcheck disable=SC1091
  source "$HOME/.config/localgo/deploy.env"
fi

: "${CLOUDFLARE_API_TOKEN:?CLOUDFLARE_API_TOKEN missing — set in ~/.config/localgo/deploy.env}"
: "${CLOUDFLARE_ACCOUNT_ID:?CLOUDFLARE_ACCOUNT_ID missing — set in ~/.config/localgo/deploy.env}"

export CLOUDFLARE_API_TOKEN CLOUDFLARE_ACCOUNT_ID
export NG_APP_API_BASE_URL="${NG_APP_API_BASE_URL:-https://be-localgo-ul36.onrender.com/api}"
export NG_APP_LIFF_ID="${NG_APP_LIFF_ID:-2010177240-Bu98ZCLT}"
# Temporary SIT playtest: persona picker (set NG_APP_ALLOW_DEV_LOGIN=false to turn off)
export NG_APP_ALLOW_DEV_LOGIN="${NG_APP_ALLOW_DEV_LOGIN:-true}"

echo "==> Generating SIT environment (api=$NG_APP_API_BASE_URL)"
node scripts/generate-fe-environment.mjs

echo "==> Building SIT"
# Match node arch to installed esbuild native binary (avoid Rosetta mismatch).
if [[ -d node_modules/@esbuild/darwin-arm64 ]] && command -v arch >/dev/null; then
  arch -arm64 npm run build:sit
elif [[ -d node_modules/@esbuild/darwin-x64 ]] && [[ -x /usr/local/bin/node ]]; then
  arch -x86_64 /usr/local/bin/node node_modules/@angular/cli/bin/ng.js build --configuration sit
  node scripts/absolutize-assets.mjs
else
  npm run build:sit
fi

DIST_DIR="dist/localgo/browser"
if [[ ! -d "$DIST_DIR" ]]; then
  DIST_DIR="$(find dist -type d -name browser | head -1)"
fi
: "${DIST_DIR:?Could not find Angular browser output under dist/}"

echo "==> Absolutizing asset paths (deep-link MIME fix)"
node scripts/absolutize-assets.mjs "$DIST_DIR"

echo "==> Deploying $DIST_DIR to Cloudflare Pages project localgo-sit (production)"
# wrangler/workerd must match the CPU arch of the node that runs it (avoid Rosetta mismatch).
WRANGLER_BIN="$(command -v wrangler)"
if [[ "$(uname -m)" == "arm64" ]] && command -v arch >/dev/null; then
  OUT="$(arch -arm64 "$WRANGLER_BIN" pages deploy "$DIST_DIR" \
    --project-name=localgo-sit \
    --branch=main \
    --commit-dirty=true 2>&1)" || OUT="$(wrangler pages deploy "$DIST_DIR" \
    --project-name=localgo-sit \
    --branch=main \
    --commit-dirty=true 2>&1)"
else
  OUT="$(wrangler pages deploy "$DIST_DIR" \
    --project-name=localgo-sit \
    --branch=main \
    --commit-dirty=true 2>&1)"
fi
echo "$OUT"

# Wrangler prints a per-deploy preview URL; production is confirmed via API below.
if ! echo "$OUT" | grep -qiE 'Deployment complete|Success! Uploaded'; then
  echo "ERROR: wrangler deploy failed" >&2
  exit 1
fi

# Confirm latest deployment is production (LIFF allowlist hostname)
DEPLOY_JSON="$(curl -sS -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
  "https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/pages/projects/localgo-sit/deployments?per_page=1")"
ENV="$(printf '%s' "$DEPLOY_JSON" | python3 -c 'import json,sys; d=json.load(sys.stdin); r=(d.get("result") or [{}])[0]; print(r.get("environment") or "")')"
if [[ "$ENV" != "production" ]]; then
  echo "ERROR: latest deployment environment=$ENV (want production)" >&2
  exit 1
fi

# Prefer production hostname (LIFF allowlist)
echo "OK: https://localgo-sit-616.pages.dev/"
