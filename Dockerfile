# Use official Playwright image with pre-installed browsers
# This provides a fully autonomous solution with Chromium, Firefox, and WebKit
# Last updated: 2026-01-11
FROM mcr.microsoft.com/playwright:v1.57.0-noble

# Set working directory
WORKDIR /app

# Install pnpm globally
RUN npm install -g pnpm@8.14.0

# Copy package files for dependency installation
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./

# Copy workspace packages
COPY packages ./packages
COPY apps/api ./apps/api

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build the API
RUN pnpm --filter @arbi/api build

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

# Start the API server
CMD ["pnpm", "--filter", "@arbi/api", "start"]
