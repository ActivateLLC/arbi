# Base image: Docker Hub's Node (NOT mcr.microsoft.com/playwright).
# Why: Microsoft Container Registry rate-limits anonymous pulls of the Playwright
# image, which intermittently fails Railway builds (429/401) — especially on
# rapid successive deploys. We use the widely-cached Docker Hub node:20-bookworm
# image instead, and install the Playwright Chromium browser from Playwright's
# own CDN (not MCR) below. node:20-bookworm (full, not -slim) includes the build
# toolchain needed to compile any native npm deps during install.
FROM node:20-bookworm

# Set working directory
WORKDIR /app

# Install pnpm globally
RUN npm install -g pnpm@8.14.0

# Copy package files and workspace configuration
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY tsconfig.json ./

# Copy all workspace packages and apps
COPY packages ./packages
COPY apps ./apps

# Install dependencies (no frozen lockfile due to lockfile sync issues).
# Skip Playwright's npm-postinstall browser download here — we install the
# browser explicitly below so we control the source (CDN, not MCR).
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
RUN pnpm install --no-frozen-lockfile

# Build workspace packages first (dependencies of API)
RUN pnpm --filter "@arbi/data" build || true
RUN pnpm --filter "@arbi/arbitrage-engine" build || true
RUN pnpm --filter "@arbi/ai-engine" build || true
RUN pnpm --filter "@arbi/transaction" build || true
RUN pnpm --filter "@arbi/voice-interface" build || true
RUN pnpm --filter "@arbi/web-automation" build || true

# Build the API
RUN pnpm --filter "@arbi/api" build

# Install Playwright's Chromium (+ OS deps) from the Playwright CDN, NOT MCR.
# Version pinned to match playwright/playwright-core 1.58.0 in the lockfile.
# Made NON-FATAL: a CDN/apt hiccup must never block the deploy — only the
# browser-based features (Amazon auto-purchase / ad scraping) degrade if it
# fails, and the core API (sourcing, Google Ads REST, Stripe) does not use a
# browser at runtime.
RUN unset PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD; \
    npx --yes playwright@1.58.0 install --with-deps chromium \
    || echo "WARN: Playwright Chromium install failed — browser-only features disabled this build"

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the API server from root (workspace symlinks require root context)
WORKDIR /app
CMD ["node", "apps/api/dist/index.js"]
