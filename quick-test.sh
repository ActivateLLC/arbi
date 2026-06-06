#!/bin/bash

# Quick Platform Health Check
# Run this to verify your deployment is working

set -e

echo "╔════════════════════════════════════════════════════════╗"
echo "║         ARBI Platform - Quick Health Check            ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# Configuration
API_URL="${API_URL:-http://localhost:3000}"
DASHBOARD_URL="${DASHBOARD_URL:-http://localhost:5173}"

echo "API URL: $API_URL"
echo "Dashboard URL: $DASHBOARD_URL"
echo ""

# Test 1: API Health
echo "━━━ Testing API Health ━━━"
if curl -s -f "$API_URL/health" > /dev/null; then
  HEALTH_DATA=$(curl -s "$API_URL/health")
  echo "✓ API is responding"
  echo "  Response: $HEALTH_DATA"

  # Check database
  if echo "$HEALTH_DATA" | grep -q '"database":"connected"'; then
    echo "✓ Database is connected"
  elif echo "$HEALTH_DATA" | grep -q '"database":"not_configured"'; then
    echo "⚠ Database is not configured"
  else
    echo "✗ Database connection failed"
  fi
else
  echo "✗ API is not responding"
  exit 1
fi

echo ""

# Test 2: Environment Variables (local only)
echo "━━━ Checking Environment Variables ━━━"
MISSING=0

check_env() {
  if [ -z "${!1}" ]; then
    echo "✗ Missing: $1"
    MISSING=$((MISSING + 1))
  else
    echo "✓ Found: $1"
  fi
}

check_env "DATABASE_URL"
check_env "STRIPE_SECRET_KEY"
check_env "CLOUDINARY_CLOUD_NAME"

if [ $MISSING -eq 0 ]; then
  echo "✓ All critical environment variables are set"
else
  echo "⚠ $MISSING required variables missing (may be set in Railway)"
fi

echo ""

# Test 3: API Endpoints
echo "━━━ Testing API Endpoints ━━━"
if curl -s -f "$API_URL/api/marketplace/listings" > /dev/null; then
  LISTINGS=$(curl -s "$API_URL/api/marketplace/listings" | grep -o '"listings":\[' | wc -l)
  if [ "$LISTINGS" -gt 0 ]; then
    echo "✓ Marketplace API is working"
  else
    echo "⚠ Marketplace API returned unexpected format"
  fi
else
  echo "✗ Marketplace API is not responding"
fi

echo ""

# Summary
echo "╔════════════════════════════════════════════════════════╗"
echo "║                  Health Check Complete                 ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""
echo "Next steps:"
echo "  1. Run full tests: npx tsx test-e2e.ts"
echo "  2. Start API: pnpm --filter @arbi/api start"
echo "  3. Start Dashboard: pnpm --filter @arbi/dashboard dev"
echo ""
