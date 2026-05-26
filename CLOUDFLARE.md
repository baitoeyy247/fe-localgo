# Cloudflare Pages — build settings

Cloudflare auto-runs `npm ci` before your build command. If dependency cache is stale, that step fails with `@emnapi/*` lockfile errors even after the repo is fixed.

## Required settings

| Setting | Value |
|---------|-------|
| **Environment variable** | `SKIP_DEPENDENCY_INSTALL` = `1` |
| **Build command** | `bash scripts/cloudflare-build.sh` |
| **Build output directory** | `dist/localgo/browser` |
| **Root directory** | (leave empty — repo root is the Angular app) |

## Build-time env (Variables)

| Key | Value |
|-----|-------|
| `NG_APP_API_BASE_URL` | `https://be-localgo.onrender.com/api` |
| `NG_APP_LIFF_ID` | `2010177240-Bu98ZCLT` |
| `NG_APP_MAP_DEFAULT_LAT` | `13.7563` |
| `NG_APP_MAP_DEFAULT_LNG` | `100.5018` |

## After changing env

1. Deployments → **Retry deployment**
2. If it still fails → **Clear build cache** → deploy again
