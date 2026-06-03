# Multi-stage build for optimized production image
FROM node:18-alpine AS base

# Install pnpm
RUN npm install -g pnpm@8

# Set working directory
WORKDIR /app

# Copy all source code (pnpm workspaces need full structure)
COPY . .

# Install dependencies (use --no-frozen-lockfile for Railway compatibility)
RUN pnpm install --no-frozen-lockfile

# Build all packages
RUN pnpm build

# Production stage
FROM node:18-alpine AS production

# Install pnpm
RUN npm install -g pnpm@8

WORKDIR /app

# Copy built artifacts from base stage
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/packages ./packages
COPY --from=base /app/apps/api/dist ./apps/api/dist
COPY --from=base /app/apps/api/package.json ./apps/api/package.json
COPY --from=base /app/package.json ./package.json
COPY --from=base /app/pnpm-workspace.yaml ./pnpm-workspace.yaml

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/arbitrage/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the API server
CMD ["node", "apps/api/dist/index.js"]
