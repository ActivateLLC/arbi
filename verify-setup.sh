#!/bin/bash

echo "🧪 Verifying Remotion Video Generation Setup..."
echo ""

# Test 1: Check Remotion template files exist
echo "Test 1: Checking Remotion template files..."
if [ -f "apps/api/src/services/remotion/ProductShowcase.tsx" ] && \
   [ -f "apps/api/src/services/remotion/index.tsx" ] && \
   [ -f "apps/api/src/services/remotion/renderVideo.ts" ]; then
  echo "✅ PASS - All template files exist"
else
  echo "❌ FAIL - Missing template files"
  exit 1
fi
echo ""

# Test 2: Check dependencies in package.json
echo "Test 2: Checking package.json dependencies..."
if grep -q '"remotion"' apps/api/package.json && \
   grep -q '@remotion/bundler' apps/api/package.json && \
   grep -q '@remotion/renderer' apps/api/package.json; then
  echo "✅ PASS - Remotion dependencies in package.json"
else
  echo "❌ FAIL - Missing Remotion dependencies"
  exit 1
fi
echo ""

# Test 3: Check video generation service exists
echo "Test 3: Checking video generation service..."
if [ -f "apps/api/src/services/videoAdGenerator.ts" ]; then
  echo "✅ PASS - Video generator service exists"
else
  echo "❌ FAIL - Missing video generator service"
  exit 1
fi
echo ""

# Test 4: Check API route exists
echo "Test 4: Checking video generation API routes..."
if [ -f "apps/api/src/routes/generate-video.ts" ]; then
  echo "✅ PASS - Video generation routes exist"
else
  echo "❌ FAIL - Missing video generation routes"
  exit 1
fi
echo ""

# Test 5: Check documentation
echo "Test 5: Checking documentation..."
if [ -f "VIDEO-AD-GENERATION-SETUP.md" ] && \
   [ -f "REMOTION-QUICK-START.md" ] && \
   [ -f "TEST-VIDEO-GENERATION.md" ]; then
  echo "✅ PASS - All documentation files exist"
else
  echo "❌ FAIL - Missing documentation files"
  exit 1
fi
echo ""

echo "═══════════════════════════════════════════════════════"
echo "✅ ALL TESTS PASSED!"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "Next steps:"
echo "1. Install: cd apps/api && pnpm install"
echo "2. Preview: npx remotion preview src/services/remotion/index.tsx"
echo "3. Generate: POST /api/generate-video/:listingId"
echo ""
echo "📚 Documentation:"
echo "  - REMOTION-QUICK-START.md (start here)"
echo "  - TEST-VIDEO-GENERATION.md (testing guide)"
echo "  - VIDEO-AD-GENERATION-SETUP.md (full docs)"
