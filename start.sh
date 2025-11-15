#!/bin/bash
set -e

echo "🚀 Starting Arbi API Server..."
echo "Working directory: $(pwd)"
echo "Node version: $(node --version)"
echo "Environment: ${NODE_ENV:-development}"

# Start the API server
exec node apps/api/dist/index.js
