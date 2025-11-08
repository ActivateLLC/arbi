#!/bin/bash
set -e

echo "🚀 Building Arbi Arbitrage Engine for Railway..."

# Install dependencies (without frozen lockfile for Railway compatibility)
echo "📦 Installing dependencies..."
pnpm install --no-frozen-lockfile

# Build all packages
echo "🔨 Building all packages..."
pnpm build

echo "✅ Build complete!"
