#!/bin/bash

# 🚀 Quick Setup Script for Arbi Dashboard
# Copy updated files to your 01.04.26Arbi.ai repo

echo "════════════════════════════════════════════════════════"
echo "🚀 Arbi Dashboard - File Updater"
echo "════════════════════════════════════════════════════════"
echo ""

# Check if dashboard repo path is provided
if [ -z "$1" ]; then
  echo "❌ Error: Please provide path to your 01.04.26Arbi.ai repo"
  echo ""
  echo "Usage:"
  echo "  ./COPY-FILES.sh /path/to/01.04.26Arbi.ai"
  echo ""
  echo "Example:"
  echo "  ./COPY-FILES.sh ~/Projects/01.04.26Arbi.ai"
  echo ""
  exit 1
fi

DASHBOARD_DIR="$1"

# Verify directory exists
if [ ! -d "$DASHBOARD_DIR" ]; then
  echo "❌ Error: Directory not found: $DASHBOARD_DIR"
  exit 1
fi

echo "📁 Dashboard directory: $DASHBOARD_DIR"
echo ""

# Copy files
echo "📋 Copying files..."
echo ""

# 1. vite.config.ts
if [ -f "vite.config.ts" ]; then
  cp vite.config.ts "$DASHBOARD_DIR/vite.config.ts"
  echo "  ✅ vite.config.ts (Added API proxy)"
else
  echo "  ⚠️  vite.config.ts not found"
fi

# 2. App.tsx
if [ -f "App.tsx" ]; then
  cp App.tsx "$DASHBOARD_DIR/App.tsx"
  echo "  ✅ App.tsx (Added marketplace tab)"
else
  echo "  ⚠️  App.tsx not found"
fi

# 3. Copy documentation
if [ -f "DEPLOYMENT-GUIDE.md" ]; then
  cp DEPLOYMENT-GUIDE.md "$DASHBOARD_DIR/DEPLOYMENT-GUIDE.md"
  echo "  ✅ DEPLOYMENT-GUIDE.md"
fi

if [ -f "API-REFERENCE.md" ]; then
  cp API-REFERENCE.md "$DASHBOARD_DIR/API-REFERENCE.md"
  echo "  ✅ API-REFERENCE.md"
fi

echo ""
echo "════════════════════════════════════════════════════════"
echo "✅ Files copied successfully!"
echo "════════════════════════════════════════════════════════"
echo ""
echo "📝 Next steps:"
echo ""
echo "1. Navigate to your dashboard:"
echo "   cd $DASHBOARD_DIR"
echo ""
echo "2. Test locally:"
echo "   npm install"
echo "   npm run dev"
echo ""
echo "3. Commit and push:"
echo "   git add ."
echo "   git commit -m \"Add marketplace integration\""
echo "   git push origin main"
echo ""
echo "4. Deploy to Vercel:"
echo "   - Go to vercel.com"
echo "   - Import your GitHub repo"
echo "   - Add GEMINI_API_KEY env variable"
echo "   - Deploy!"
echo ""
echo "📖 See DEPLOYMENT-GUIDE.md for full instructions"
echo ""
