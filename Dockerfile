# Use official Playwright image with pre-installed browsers
# This provides a fully autonomous solution with Chromium, Firefox, and WebKit
# Last updated: 2026-01-11
FROM mcr.microsoft.com/playwright:v1.57.0-noble

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

# Install dependencies (no frozen lockfile due to lockfile sync issues)
# Skip optional dependencies that might fail (like onnxruntime-node GPU binaries)
RUN pnpm install --no-frozen-lockfile --no-optional

# Build workspace packages first (dependencies of API)
RUN pnpm --filter "@arbi/data" build || true
RUN pnpm --filter "@arbi/arbitrage-engine" build || true
RUN pnpm --filter "@arbi/ai-engine" build || true
RUN pnpm --filter "@arbi/transaction" build || true
RUN pnpm --filter "@arbi/voice-interface" build || true
RUN pnpm --filter "@arbi/web-automation" build || true

# Build the API
RUN pnpm --filter "@arbi/api" build

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Playwright browsers are already installed in the image
# Skip browser download to save time and space
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the API server from root (workspace symlinks require root context)
WORKDIR /app
CMD ["node", "apps/api/dist/index.js"]
