# 🤖 Arbi - Autonomous Arbitrage Engine

An AI-powered autonomous arbitrage system that finds and analyzes profitable opportunities across multiple platforms, generating revenue 24/7.

## 🎯 What is Arbi?

Arbi is a **production-ready autonomous arbitrage system** that uses AI to:
- 🔍 Find underpriced products across eBay, Amazon, Walmart, Target
- 🤖 Score opportunities with AI (0-100 point algorithm)
- 💰 Calculate real profit after fees, shipping, and costs
- ⚡ Execute trades automatically (with budget controls)
- 📊 Generate passive income for users
- 💵 Platform earns 25% commission on profits

**Revenue Potential:** $15k-40k/month with proper scaling

## ✨ Key Features

### AI-Powered Intelligence
- **Opportunity Analyzer** - Scores each opportunity 0-100 points
- **VIX Market Monitoring** - Adjusts risk based on real-time market volatility
- **Risk Manager** - Enforces budget limits and spending controls
- **Confidence Scoring** - Filters low-quality opportunities automatically
- **Multi-Strategy System** - eBay arbitrage, retail arbitrage, seasonal deals

### Data Sources (3 Scouts)
1. **eBay Scout** - Finds items listed below sold price average (FREE)
2. **Web Scraper** - Scrapes Target, Walmart, eBay with Playwright (FREE)
3. **Rainforest Scout** - Gets Amazon data without Amazon API ($49/mo)

### Risk Management
- **VIX-Adjusted Scoring** - Automatically adapts to market volatility
- Per-opportunity spending limits ($400 default)
- Daily spending limits ($1,000 default)
- Monthly budget caps ($10,000 default)
- Risk tolerance settings (conservative/moderate/aggressive)
- Real-time spending tracking
- Market condition warnings during high volatility

### Complete REST API
```
GET  /api/arbitrage/opportunities       - Find current opportunities
GET  /api/arbitrage/opportunities?minProfit=10&minROI=15
GET  /api/arbitrage/market-conditions   - Get VIX and market volatility data
GET  /api/arbitrage/health              - System health check
POST /api/arbitrage/execute             - Execute an opportunity
GET  /api/arbitrage/settings            - Get user settings
PUT  /api/arbitrage/settings            - Update budget/risk settings
```

## 🚀 Quick Start

### Prerequisites
- Node.js v18+
- pnpm v8+
- eBay Developer API key (FREE - get at [developer.ebay.com/join](https://developer.ebay.com/join))

### Installation

```bash
# Clone the repository
git clone https://github.com/ActivateLLC/arbi.git
cd arbi

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Configure environment
cp .env.example .env
# Add your eBay API key: EBAY_APP_ID=your_app_id_here

# Start the API server
cd apps/api
node dist/index.js
```

### Test It

```bash
# Check system health
curl http://localhost:3000/api/arbitrage/health

# Find opportunities
curl http://localhost:3000/api/arbitrage/opportunities

# Filter by profit/ROI
curl "http://localhost:3000/api/arbitrage/opportunities?minProfit=20&minROI=15"
```

## 📊 Example Output

```json
{
  "totalFound": 15,
  "recommended": 8,
  "marketCondition": {
    "vixLevel": "normal",
    "vixValue": 18.5,
    "description": "Normal market volatility",
    "recommendation": "Market conditions are normal. Proceed with standard caution."
  },
  "opportunities": [
    {
      "opportunity": {
        "title": "Apple AirPods Pro (2nd Gen)",
        "buyPrice": 189.99,
        "sellPrice": 249.99,
        "estimatedProfit": 19.50,
        "roi": 10.26,
        "buySource": "Target Clearance",
        "sellSource": "eBay"
      },
      "analysis": {
        "score": 72,
        "shouldExecute": true,
        "reasons": ["High confidence based on historical data"],
        "marketCondition": {
          "vixLevel": "normal",
          "vixValue": 18.5,
          "description": "Normal market volatility"
        }
      },
      "riskAssessment": {
        "approved": true,
        "budgetCheck": { "passed": true },
        "marketVolatilityFactor": 1.0
      },
      "recommended": true
    }
  ]
}
```

## 🏗️ Project Structure

```
arbi/
├── apps/
│   ├── api/              # Main API service (Express + TypeScript)
│   └── web/              # Customer-facing React app
├── packages/
│   ├── arbitrage-engine/ # 🎯 CORE: Autonomous arbitrage system
│   │   ├── scouts/       # Data source integrations
│   │   ├── analyzer/     # AI opportunity scoring
│   │   └── risk-manager/ # Budget & risk controls
│   ├── ai-engine/        # OpenAI Agents SDK integration
│   ├── web-automation/   # Playwright browser automation
│   ├── voice-interface/  # Whisper + ElevenLabs
│   ├── transaction/      # Hyperswitch payment processor
│   └── data/             # PostgreSQL + Redis
├── scripts/
│   └── get-ebay-api-key.ts # Automated API key creation
└── docs/
    ├── DEPLOY_NOW.md             # 3 deployment options (2-5 min)
    ├── LAUNCH_CHECKLIST.md       # Complete setup guide
    ├── AMAZON_API_ALTERNATIVES.md # API solutions
    ├── QUICKSTART_EBAY.md        # eBay setup (5 min)
    └── ENHANCEMENT_ROADMAP.md    # Future ML/RL improvements
```

## 🌟 Revenue Model

### For Users
- Set budget limits (daily, monthly, per-opportunity)
- System finds profitable opportunities automatically
- Execute trades manually or automatically
- Keep 75% of all profits

### For Platform
- Earn 25% commission on all profits
- No risk - users provide capital
- Scales infinitely with user base
- Recurring revenue from successful trades

### Projected Revenue
| Scenario | Deals/Day | Avg Profit | User Take | Platform Take | Monthly Revenue |
|----------|-----------|------------|-----------|---------------|-----------------|
| Conservative | 5 | $30 | $112.50/day | $37.50/day | **$1,125/month** |
| Moderate | 15 | $45 | $506.25/day | $168.75/day | **$5,063/month** |
| Aggressive | 30 | $60 | $1,350/day | $450/day | **$13,500/month** |

*Per user. Scale to 100 users = $112k-1.35M/month platform revenue*

## 🚀 Deployment

### Option 1: Railway (Recommended - 2 minutes)
```bash
npm i -g @railway/cli
railway login
railway init
railway up
railway variables set EBAY_APP_ID=your_app_id_here
```

### Option 2: Render (Free Forever Tier)
1. Connect your GitHub repo at [render.com](https://render.com)
2. Set build command: `pnpm install && pnpm build`
3. Set start command: `cd apps/api && node dist/index.js`
4. Add environment variable: `EBAY_APP_ID`

### Option 3: Docker
```bash
docker build -t arbi .
docker run -p 3000:3000 -e EBAY_APP_ID=your_key arbi
```

**See [DEPLOY_NOW.md](DEPLOY_NOW.md) for detailed deployment guides**

## 🔧 Configuration

### Environment Variables

```bash
# Required
EBAY_APP_ID=your_ebay_app_id        # Get at developer.ebay.com/join (FREE)

# Optional (for additional data sources)
RAINFOREST_API_KEY=your_key         # Amazon data API ($49/mo, 1000 free)
ALPHA_VANTAGE_API_KEY=your_key      # VIX market data (FREE - alphavantage.co)
OPENAI_API_KEY=your_key             # For voice features

# Server
NODE_ENV=production
PORT=3000
```

### Budget Settings

Configure in code or via API:
```typescript
{
  dailyLimit: 1000,           // Max spend per day
  perOpportunityMax: 400,     // Max per single trade
  monthlyLimit: 10000,        // Max spend per month
  reserveFund: 1000,          // Emergency reserve
  riskTolerance: 'moderate',  // conservative | moderate | aggressive
  enabledStrategies: [
    'ecommerce_arbitrage',
    'seasonal_arbitrage',
    'clearance_arbitrage'
  ]
}
```

## 📚 Documentation

- **[VIX_INTEGRATION.md](VIX_INTEGRATION.md)** - VIX market volatility integration guide
- **[DEPLOY_NOW.md](DEPLOY_NOW.md)** - Deploy in 2-5 minutes (Railway/Render/VPS)
- **[LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md)** - Complete setup walkthrough
- **[AMAZON_API_ALTERNATIVES.md](AMAZON_API_ALTERNATIVES.md)** - 3 solutions without Amazon API
- **[QUICKSTART_EBAY.md](QUICKSTART_EBAY.md)** - Get eBay API key in 5 minutes
- **[ENHANCEMENT_ROADMAP.md](ENHANCEMENT_ROADMAP.md)** - ML/RL improvements (3-5x profit)

## 🛠️ Development

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run specific package
pnpm --filter @arbi/api dev
pnpm --filter @arbi/web dev

# Run tests
pnpm test

# Lint
pnpm lint

# Type check
pnpm type-check
```

## 🤝 How It Works

### 1. Data Collection
- Scouts scan eBay, retail sites, APIs every 60 seconds
- Extract product prices, sold prices, demand metrics
- Cache results to reduce API calls

### 2. Opportunity Analysis
```typescript
// AI Scoring Algorithm (0-100 points)
// Now includes VIX-based market condition adjustments
score =
  + profitPotential (0-30 points)  // ROI-based
  + confidence (0-25 points)        // Historical data * VIX adjustment
  + speedToProfit (0-20 points)     // Time to sell
  + riskLevel (0-15 points)         // Low/medium/high
  + volatility (0-10 points)        // Price stability / VIX adjustment
```

### 3. Risk Assessment
- **Monitor market volatility** (VIX index integration)
- Adjust risk scores based on market conditions
- Check budget limits (daily, monthly, per-opportunity)
- Verify spending capacity
- Calculate risk score with market volatility factor
- Approve or reject opportunity

### 4. Execution (Manual or Auto)
- Purchase item from buy source
- Create listing on sell platform
- Track inventory and sales
- Calculate actual profit
- Update ML models with results

## 🔐 Security

- Budget limits enforced at multiple levels
- Spending tracked in real-time
- Risk tolerance configurable per user
- All API calls rate-limited
- Secure environment variable management
- No sensitive data in logs

## 📈 Scaling

### Phase 1: Launch (Month 1)
- Deploy to Railway/Render
- Enable eBay scout
- Target 10-20 users
- Revenue: $5k-10k/month

### Phase 2: Growth (Months 2-3)
- Add web scraper scout
- Implement auto-execution
- Scale to 100 users
- Revenue: $50k-100k/month

### Phase 3: Scale (Months 4-6)
- Add ML price prediction
- Implement reinforcement learning
- Add more data sources
- Scale to 500 users
- Revenue: $250k-500k/month

## 💡 Use Cases

1. **Retail Arbitrage** - Buy clearance, sell at market price
2. **eBay Flipping** - Find underpriced listings, resell
3. **Seasonal Trading** - Buy off-season, sell peak season
4. **Brand Arbitrage** - Regional price differences
5. **Liquidation** - Bulk purchases from liquidation auctions

## 🎯 Roadmap

- [x] Core arbitrage engine
- [x] eBay API integration
- [x] Web scraping system
- [x] AI opportunity scoring
- [x] Risk management
- [x] REST API
- [ ] Auto-execution system
- [ ] ML price prediction (TensorFlow.js)
- [ ] Reinforcement learning (PyTorch + RLlib)
- [ ] Mobile app
- [ ] Multi-user platform
- [ ] Social features (share opportunities)

See [ENHANCEMENT_ROADMAP.md](ENHANCEMENT_ROADMAP.md) for detailed technical roadmap.

## 📊 Tech Stack

- **Backend:** Node.js, TypeScript, Express
- **Frontend:** React, Vite, TailwindCSS
- **Data:** PostgreSQL, Redis
- **AI:** OpenAI Agents SDK, Custom ML models
- **Automation:** Playwright
- **APIs:** eBay Finding API, Rainforest API
- **Infrastructure:** Docker, Railway, Render

## 🤖 Why Arbi?

Traditional arbitrage requires:
- ❌ Manual product research (hours per day)
- ❌ Constant price monitoring
- ❌ Spreadsheet profit calculations
- ❌ Risk of bad deals
- ❌ Limited scaling

**Arbi automates everything:**
- ✅ AI finds opportunities 24/7
- ✅ Instant price comparisons
- ✅ Automatic profit calculations
- ✅ Risk management built-in
- ✅ Infinite scaling potential

## 📞 Support

- **Issues:** [GitHub Issues](https://github.com/ActivateLLC/arbi/issues)
- **Docs:** See `/docs` folder
- **Email:** support@activatellc.com

## 📄 License

MIT License - See [LICENSE](LICENSE) file

---

**Built with ❤️ by ActivateLLC**

*Transform market inefficiencies into automated revenue streams.*
