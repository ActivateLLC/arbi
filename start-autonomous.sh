#!/bin/bash

# 🚀 START AUTONOMOUS MARKETPLACE
# Press this and make money!

echo "🤖 STARTING AUTONOMOUS MARKETPLACE..."
echo ""

# Start the autonomous system
response=$(curl -s -X POST https://api.arbi.creai.dev/api/autonomous-marketplace/start \
  -H "Content-Type: application/json" \
  -d '{
    "productsToFind": 10,
    "minProfit": 100,
    "maxPrice": 5000,
    "dailyBudgetPerProduct": 50,
    "autoScale": true
  }')

echo "$response" | jq '.'

# Extract session ID
sessionId=$(echo "$response" | jq -r '.sessionId')

if [ "$sessionId" != "null" ]; then
  echo ""
  echo "✅ Autonomous system started!"
  echo "Session ID: $sessionId"
  echo ""
  echo "Monitoring progress..."
  echo ""

  # Monitor progress
  for i in {1..30}; do
    sleep 5
    status=$(curl -s https://api.arbi.creai.dev/api/autonomous-marketplace/status/$sessionId)

    echo "[$i] Status:"
    echo "$status" | jq '{
      status: .status,
      phase: .progress.phase,
      productsFound: .progress.productsFound,
      listingsCreated: .progress.listingsCreated,
      campaignsLaunched: .progress.campaignsLaunched,
      totalProfit: .progress.totalProfit
    }'
    echo ""

    # Check if completed
    currentStatus=$(echo "$status" | jq -r '.status')
    if [ "$currentStatus" = "completed" ] || [ "$currentStatus" = "failed" ]; then
      echo "🎉 SYSTEM READY!"
      echo ""
      echo "Final Results:"
      echo "$status" | jq '.'
      break
    fi
  done
else
  echo "❌ Failed to start autonomous system"
  echo "$response"
fi
