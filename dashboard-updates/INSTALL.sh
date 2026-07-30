#!/bin/bash

# 🚀 One-Command Dashboard Setup
# This script updates your 01.04.26Arbi.ai repo with full Arbi API integration

set -e  # Exit on error

echo "════════════════════════════════════════════════════════"
echo "🚀 Arbi Dashboard - Auto Setup"
echo "════════════════════════════════════════════════════════"
echo ""

# Check if we're in the dashboard repo
if [ ! -f "package.json" ]; then
  echo "❌ Error: Not in dashboard directory"
  echo "Please run this from your 01.04.26Arbi.ai directory"
  exit 1
fi

# Check for required directories
if [ ! -d "services" ]; then
  mkdir -p services
  echo "✅ Created services/ directory"
fi

if [ ! -d "components" ]; then
  echo "❌ Error: components/ directory not found"
  exit 1
fi

echo "📥 Downloading updated files from GitHub..."
echo ""

BASE_URL="https://raw.githubusercontent.com/ActivateLLC/arbi/claude/reduce-repo-size-yo1br/dashboard-updates"

# Download files
echo "  📄 App.tsx..."
curl -sL "$BASE_URL/App.tsx" -o App.tsx

echo "  📄 vite.config.ts..."
curl -sL "$BASE_URL/vite.config.ts" -o vite.config.ts

echo "  📄 services/arbiService.ts..."
curl -sL "$BASE_URL/services/arbiService.ts" -o services/arbiService.ts

echo "  📄 components/MarketplaceStats.tsx..."
curl -sL "$BASE_URL/components/MarketplaceStats.tsx" -o components/MarketplaceStats.tsx

echo "  📄 DEPLOYMENT-GUIDE.md..."
curl -sL "$BASE_URL/DEPLOYMENT-GUIDE.md" -o DEPLOYMENT-GUIDE.md

echo "  📄 API-REFERENCE.md..."
curl -sL "$BASE_URL/API-REFERENCE.md" -o API-REFERENCE.md

echo ""
echo "════════════════════════════════════════════════════════"
echo "✅ Files updated successfully!"
echo "════════════════════════════════════════════════════════"
echo ""
echo "📝 What changed:"
echo "  ✅ App.tsx - Added marketplace tab"
echo "  ✅ vite.config.ts - Added API proxy (no CORS!)"
echo "  ✅ services/arbiService.ts - Correct API field names"
echo "  ✅ components/MarketplaceStats.tsx - Updated UI"
echo ""
echo "🚀 Next steps:"
echo ""
echo "1. Test locally:"
echo "   npm install"
echo "   npm run dev"
echo ""
echo "2. Commit and push:"
echo "   git add ."
echo "   git commit -m 'Add marketplace integration with Arbi API'"
echo "   git push origin main"
echo ""
echo "3. Deploy to Vercel:"
echo "   - Go to vercel.com"
echo "   - Import your GitHub repo"
echo "   - Add GEMINI_API_KEY env variable"
echo "   - Deploy!"
echo ""
echo "📖 See DEPLOYMENT-GUIDE.md for detailed instructions"
echo ""
