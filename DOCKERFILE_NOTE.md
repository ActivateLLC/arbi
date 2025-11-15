# Dockerfile Removal Note

## Why Dockerfiles were moved to .backup

Railway was detecting and using Dockerfile instead of Nixpacks configuration.
This caused issues with the monorepo structure because:

1. **Dockerfile approach** requires manual copying of built packages
2. **Nixpacks approach** (recommended by Railway) automatically handles pnpm workspaces
3. **pnpm --filter** commands work seamlessly with Nixpacks

## Original Dockerfiles

- `Dockerfile` → `Dockerfile.backup` (root)
- `apps/api/Dockerfile` → `apps/api/Dockerfile.backup`

## Current Configuration

Railway now uses **Nixpacks** with configuration from:
- `railway.json` (primary)
- `nixpacks.toml` (build config)
- `railway.toml` (alternative)

## If You Need Docker

To use Docker locally:
1. Rename `Dockerfile.backup` to `Dockerfile`
2. Build: `docker build -t arbi-api .`
3. Run: `docker run -p 3000:3000 arbi-api`

**Note**: Do NOT commit active Dockerfile to repo if deploying to Railway,
as it will override Nixpacks configuration.
