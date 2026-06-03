#!/bin/bash
set -e

echo "🚀 Starting Arbi API Server..."
echo "Working directory: $(pwd)"
echo "Node version: $(node --version)"
echo "PNPM version: $(pnpm --version)"
echo "Environment: ${NODE_ENV:-development}"

# Start the API server using pnpm filter (Railway best practice)
exec pnpm --filter @arbi/api start
