# Deploy Builder Note

## Canonical builder: Dockerfile

Railway deploys `@arbi/api` using the root **`Dockerfile`**. This is the single
source of truth, declared in `railway.json` (`build.builder = "DOCKERFILE"`).

The Dockerfile is built on the official Playwright image
(`mcr.microsoft.com/playwright:v1.58.0-noble`) so the Chromium/Firefox/WebKit
browsers required by the scraping scouts and web-automation are preinstalled.
This is why Dockerfile — not Nixpacks — is the right builder for this app:
Nixpacks would have to `npx playwright install --with-deps` on every build,
which is slow and fragile.

### Keep in lockstep
- The image tag (`v1.58.0-noble`) MUST match the `playwright` /
  `playwright-core` version pinned in `pnpm-lock.yaml`. We skip the runtime
  browser download (`PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1`), so a version
  mismatch breaks `chromium.launch()` at runtime.

### Dashboard
Confirm the Railway service has **Settings → Build → Builder = Dockerfile**.
A dashboard override can take precedence over `railway.json`.

## Removed (previously conflicting) config
The following Nixpacks/duplicate configs were removed so there is exactly one
builder definition:
- `railway.toml` (declared a different build command than `railway.json`)
- `nixpacks.toml`, `nixpacks.toml.deprecated`
- `Procfile`, `railway-build.sh`
- `.railway-deploy` (stale redeploy-trigger file)

## Local Docker
1. `docker build -t arbi-api .`
2. `docker run -p 3000:3000 --env-file apps/api/.env arbi-api`
