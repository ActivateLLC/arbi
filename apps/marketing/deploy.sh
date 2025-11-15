#!/bin/bash

# ARBI Marketing Site Deployment Script
# ======================================

set -e  # Exit on error

echo "🚀 Deploying ARBI Marketing Site to Vercel..."
echo ""

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm install -g vercel
fi

# Check if user is logged in
if ! vercel whoami &> /dev/null; then
    echo "🔐 You need to login to Vercel first."
    echo "   Run: vercel login"
    echo ""
    exit 1
fi

# Get current directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo "📍 Working directory: $SCRIPT_DIR"
echo ""

# Deploy to production
echo "🚢 Deploying to production..."
vercel --prod --yes

echo ""
echo "✅ Deployment complete!"
echo ""
echo "🌐 Your site is now live!"
echo "📊 Check the Vercel dashboard for your URL"
echo ""
echo "📝 Next steps:"
echo "   1. Test the signup flow"
echo "   2. Set up custom domain (optional)"
echo "   3. Add signup API endpoint"
echo "   4. Launch! 🎉"
echo ""
