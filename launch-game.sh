#!/bin/bash

# 🎮 ARBI $10K in 24 Hours - LAUNCH SCRIPT
# This script starts the game and begins the 24-hour challenge

set -e

echo "🎮 =========================================="
echo "🎯 ARBI $10K IN 24 HOURS - GAME START"
echo "🎮 =========================================="
echo ""

# Check if API is responding
echo "✅ Step 1: Checking API health..."
API_URL="https://arbi-production.up.railway.app"
HEALTH=$(curl -s ${API_URL}/health | jq -r '.status')

if [ "$HEALTH" != "ok" ]; then
  echo "❌ API is not responding! Check Railway deployment."
  exit 1
fi
echo "   ✅ API is healthy"
echo ""

# Check if database is connected
echo "✅ Step 2: Verifying database..."
DB_STATUS=$(curl -s ${API_URL}/api/marketplace/health | jq -r '.features.databasePersistence')
if [ "$DB_STATUS" != "true" ]; then
  echo "❌ Database not connected! Configure DATABASE_URL in Railway."
  exit 1
fi
echo "   ✅ Database connected"
echo ""

# Check if scouts are enabled
echo "✅ Step 3: Checking scouts..."
SCOUTS=$(curl -s ${API_URL}/api/arbitrage/health | jq -r '.scoutsEnabled')
if [ "$SCOUTS" -lt "2" ]; then
  echo "❌ Not enough scouts enabled! Expected 2+, got $SCOUTS"
  exit 1
fi
echo "   ✅ $SCOUTS scouts enabled (Rainforest + WebScraper)"
echo ""

# Enable Turbo Mode
echo "🚀 Step 4: Enabling TURBO MODE (5-minute scans)..."
curl -s -X POST ${API_URL}/api/revenue/turbo-mode \
  -H "Content-Type: application/json" \
  -d '{"enabled": true}' | jq '.turboModeEnabled'
echo "   ⚡ Turbo mode ACTIVATED"
echo ""

# Set Revenue Target
echo "💰 Step 5: Setting revenue target ($10,000 in 24 hours)..."
curl -s -X POST ${API_URL}/api/revenue/set-target \
  -H "Content-Type: application/json" \
  -d '{"targetAmount": 10000, "deadlineHours": 24}' | jq '.target'
echo "   🎯 Target locked: $10,000 in 24 hours"
echo ""

# Start Autonomous Listing
echo "🤖 Step 6: Starting AUTONOMOUS LISTING ENGINE..."
curl -s -X POST ${API_URL}/api/autonomous-control/start-listing \
  -H "Content-Type: application/json" \
  -d '{
    "scanIntervalMinutes": 5,
    "minScore": 70,
    "minProfit": 50,
    "minROI": 20,
    "markupPercentage": 35,
    "maxListingsPerRun": 50
  }' | jq '.success, .message'
echo "   ✅ Autonomous engine STARTED"
echo ""

echo "🎮 =========================================="
echo "⏱️  GAME STARTED! Timer begins NOW."
echo "🎯 Target: $10,000 profit in 24 hours"
echo "🎮 =========================================="
echo ""
echo "📊 Monitor progress:"
echo "   curl ${API_URL}/api/revenue/status | jq '.progress'"
echo ""
echo "📦 Check listings created:"
echo "   curl ${API_URL}/api/marketplace/listings?status=active | jq '.total'"
echo ""
echo "💰 Check sales:"
echo "   curl ${API_URL}/api/marketplace/orders | jq '.stats'"
echo ""
echo "🚀 Google Ads will be auto-created for each listing!"
echo "   (Check Google Ads dashboard in 1-2 hours for approval)"
echo ""
echo "⏰ Hour-by-hour targets:"
echo "   Hour 6:  $2,500  (25%)"
echo "   Hour 12: $5,000  (50%)"
echo "   Hour 18: $7,500  (75%)"
echo "   Hour 24: $10,000 (WIN!)"
echo ""
echo "🎮 LET'S GO! 🚀💰"
