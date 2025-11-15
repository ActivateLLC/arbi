FROM node:18-alpine AS base

# Install pnpm
RUN npm install -g pnpm

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy pnpm workspace files
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./

# Copy packages and app package.json files
COPY packages/*/package.json ./packages/
COPY apps/api/package.json ./apps/api/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Development image
FROM base AS development
WORKDIR /app

# Copy node modules from deps image
COPY --from=deps /app/node_modules ./node_modules

# Set up environment
ENV NODE_ENV=development

# Copy source code
COPY . .

# Expose port
EXPOSE 3000

# Start development server
CMD ["pnpm", "dev"]

# Builder image
FROM base AS builder
WORKDIR /app

# Copy node modules from deps image
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build the project
RUN pnpm build

# Production image
FROM base AS production
WORKDIR /app

# Set up environment
ENV NODE_ENV=production

# Copy necessary files from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 arbi && \
    chown -R arbi:nodejs /app

# Switch to non-root user
USER arbi

# Expose port
EXPOSE 3000

# Start production server
CMD ["node", "apps/api/dist/index.js"]
