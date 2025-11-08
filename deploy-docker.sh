#!/bin/bash

echo "🚀 Deploying Arbi Autonomous Arbitrage Engine with Docker"
echo "==========================================================="
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first:"
    echo "   https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if docker-compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ docker-compose is not installed. Please install it:"
    echo "   https://docs.docker.com/compose/install/"
    exit 1
fi

echo "✅ Docker and docker-compose are installed"
echo ""

# Check for .env file
if [ ! -f .env ]; then
    echo "⚠️  No .env file found. Creating one..."
    cat > .env << 'EOF'
# eBay Developer API Key (FREE - get at https://developer.ebay.com/join/)
EBAY_APP_ID=

# Optional: Rainforest API for Amazon data ($49/mo, 1000 free requests)
RAINFOREST_API_KEY=

# Server configuration
NODE_ENV=production
PORT=3000
EOF
    echo "✅ Created .env file"
    echo ""
    echo "⚠️  IMPORTANT: You need to add your eBay API key to .env"
    echo "   1. Get free key at: https://developer.ebay.com/join/"
    echo "   2. Open .env and add: EBAY_APP_ID=your_app_id_here"
    echo ""
    read -p "Press Enter after adding your API key to continue..."
fi

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Check if EBAY_APP_ID is set
if [ -z "$EBAY_APP_ID" ]; then
    echo "⚠️  WARNING: EBAY_APP_ID is not set in .env"
    echo "   The app will run with mock data only."
    echo "   Get your free API key at: https://developer.ebay.com/join/"
    echo ""
fi

echo "📦 Building Docker image..."
docker-compose -f docker-compose.prod.yml build

if [ $? -ne 0 ]; then
    echo "❌ Build failed. Check the error above."
    exit 1
fi

echo "✅ Build complete!"
echo ""

echo "🚀 Starting Arbi Arbitrage Engine..."
docker-compose -f docker-compose.prod.yml up -d

if [ $? -ne 0 ]; then
    echo "❌ Failed to start. Check the error above."
    exit 1
fi

echo ""
echo "✅ Arbi is running!"
echo ""
echo "🌐 API URL: http://localhost:3000"
echo ""
echo "📊 Quick Tests:"
echo "   Health Check:    curl http://localhost:3000/api/arbitrage/health"
echo "   Opportunities:   curl http://localhost:3000/api/arbitrage/opportunities"
echo ""
echo "📋 Useful Commands:"
echo "   View logs:       docker-compose -f docker-compose.prod.yml logs -f"
echo "   Stop:            docker-compose -f docker-compose.prod.yml down"
echo "   Restart:         docker-compose -f docker-compose.prod.yml restart"
echo "   View status:     docker-compose -f docker-compose.prod.yml ps"
echo ""
echo "🎉 Deployment complete! Your arbitrage engine is finding opportunities!"
