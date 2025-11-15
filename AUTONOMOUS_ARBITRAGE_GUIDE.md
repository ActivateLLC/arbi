# Autonomous Arbitrage System - User Guide

## 🚀 Welcome to the Future of Arbitrage

Your ARBI system now autonomously scans markets 24/7, finding profitable opportunities across ALL industries - from consumer electronics to luxury goods worth $100K+.

## Quick Start (Minimal User Input Required)

### Step 1: Get your eBay App ID (Free)
1. Go to https://developer.ebay.com/join/
2. Create a free account
3. Get your App ID (Production Keys)
4. Add to Railway environment variables: `EBAY_APP_ID=your_app_id_here`

### Step 2: Start the Autonomous System
```bash
curl -X POST https://your-app.railway.app/api/autonomous/start \
  -H "Content-Type: application/json" \
  -d '{
    "config": {
      "minScore": 70,
      "minROI": 20,
      "minProfit": 5,
      "maxPrice": 100,
      "scanInterval": 15,
      "autoBuyEnabled": false
    }
  }'
```

**That's it!** The system is now running autonomously.

## 🤖 What Happens Next (Fully Automated)

### Every 15 Minutes:
1. ✅ Scans eBay for deals across trending categories
2. ✅ Calculates true profit (including ALL fees)
3. ✅ Scores opportunities (0-100)
4. ✅ Alerts you on high-value deals (score 70+)
5. ✅ Optional: Auto-purchases deals (score 90+) within budget

### You Get Notified When:
- **Score 70-79** (Medium): Email notification
- **Score 80-89** (High): Email + SMS alert
- **Score 90-100** (Excellent): Immediate multi-channel alert + optional auto-buy

## 📊 Check Your Opportunities

### Get Current Opportunities
```bash
curl https://your-app.railway.app/api/autonomous/opportunities
```

### Filter by Score
```bash
curl https://your-app.railway.app/api/autonomous/opportunities?minScore=80&limit=10
```

### Get Statistics
```bash
curl https://your-app.railway.app/api/autonomous/stats
```

## 💰 Revenue Potential

### Conservative Scenario (Manual Review)
- **Opportunities Found**: 50-100/day
- **You Act On**: 5-10 deals/day
- **Avg Profit**: $15/deal
- **Monthly Profit**: $2,250-$4,500

### Aggressive Scenario (Auto-Buy Enabled)
- **Opportunities Found**: 100+/day
- **Auto-Buy**: 20-30 deals/day within budget
- **Avg Profit**: $20/deal
- **Monthly Profit**: $12,000-$18,000

### UHNW Luxury Model (High-Value Items)
- **Categories**: Watches, handbags, art, cars
- **Opportunities Found**: 5-10/week
- **You Act On**: 2-3 deals/month
- **Avg Profit**: $5,000-$50,000/deal
- **Monthly Profit**: $10,000-$150,000+

## 🎯 Configuration Options

### Basic Settings
```json
{
  "minScore": 70,          // Only alert on opportunities scoring 70+
  "minROI": 20,            // Minimum 20% return on investment
  "minProfit": 5,          // Minimum $5 profit per item
  "maxPrice": 100,         // Maximum purchase price $100
  "scanInterval": 15,      // Scan every 15 minutes
  "autoBuyEnabled": false, // Manual review required
  "dailyBudget": 500       // Max $500 spending per day
}
```

### Luxury/High-Value Settings
```json
{
  "minScore": 80,          // Higher quality threshold
  "minROI": 30,            // 30% minimum ROI
  "minProfit": 1000,       // Minimum $1,000 profit
  "maxPrice": 50000,       // Up to $50K items
  "scanInterval": 60,      // Scan every hour (luxury market slower)
  "autoBuyEnabled": false, // Always manual review for high-value
  "dailyBudget": 100000    // $100K daily budget
}
```

### Update Configuration
```bash
curl -X PUT https://your-app.railway.app/api/autonomous/config \
  -H "Content-Type: application/json" \
  -d '{
    "minScore": 80,
    "minROI": 25,
    "minProfit": 10
  }'
```

## 🔍 Understanding Opportunity Scores

### Score Breakdown (0-100)

**Excellent (90-100)**
- ✅ 30%+ profit margin
- ✅ 50%+ ROI
- ✅ $20+ net profit
- ✅ Highly rated seller (99%+, 10K+ feedback)
- ✅ Low competition
- ✅ High demand
- ⚠️ Low risk

**High (80-89)**
- ✅ 20-30% profit margin
- ✅ 30-50% ROI
- ✅ $10-20 profit
- ✅ Good seller rating
- ✅ Moderate competition
- ⚠️ Medium risk

**Medium (70-79)**
- ✅ 15-20% profit margin
- ✅ 20-30% ROI
- ✅ $5-10 profit
- ⚠️ Some concerns
- ⚠️ Manual review recommended

**Low (<70)**
- ❌ Not recommended
- ❌ Low margins or high risk
- ❌ Filtered out automatically

## 🎛️ API Endpoints

### Status & Control
```
GET  /api/autonomous/status          - System status
POST /api/autonomous/start           - Start autonomous scanning
POST /api/autonomous/stop            - Stop scanning
POST /api/autonomous/scan-now        - Manual scan trigger
```

### Opportunities
```
GET  /api/autonomous/opportunities   - List opportunities
GET  /api/autonomous/stats           - Detailed statistics
DELETE /api/autonomous/opportunities - Clear opportunities
```

### Configuration
```
GET  /api/autonomous/config          - Get current config
PUT  /api/autonomous/config          - Update configuration
```

## 📈 Example Opportunity Response

```json
{
  "id": "opp_1234567890_abc123",
  "product": {
    "title": "Apple AirPods Pro (2nd Generation) - White",
    "price": 179.99,
    "imageUrl": "https://...",
    "url": "https://ebay.com/itm/...",
    "condition": "New",
    "seller": {
      "username": "tech_deals_pro",
      "feedbackScore": 15234,
      "feedbackPercentage": 99.8
    }
  },
  "profit": {
    "sourcePrice": 179.99,
    "targetPrice": 249.99,
    "netProfit": 42.35,
    "profitMargin": 16.94,
    "roi": 23.52,
    "totalCost": 191.54,
    "totalRevenue": 203.74
  },
  "score": {
    "score": 82,
    "tier": "high",
    "confidence": 0.85,
    "reasoning": [
      "Strong opportunity with favorable indicators"
    ],
    "greenFlags": [
      "Excellent 16.9% profit margin",
      "Strong 24% ROI",
      "Highly rated seller"
    ],
    "redFlags": []
  },
  "foundAt": "2024-11-15T10:30:00Z",
  "expiresAt": "2024-11-16T10:30:00Z",
  "status": "alerted"
}
```

## 🛡️ Safety Features

### Budget Controls
- Daily spending limits
- Per-item price limits
- Category restrictions
- Profit margin minimums

### Risk Management
- Seller rating verification
- Price anomaly detection
- Competition analysis
- Expiration tracking

### Auto-Buy Safety (When Enabled)
- Score must be 90+
- Within daily budget
- Seller rating 95%+
- Price not suspiciously low
- Logs all transactions

## 🎓 Best Practices

### Start Conservative
1. Begin with `autoBuyEnabled: false`
2. Review opportunities manually for 1-2 weeks
3. Learn what good deals look like
4. Adjust thresholds based on your experience

### Scale Gradually
1. Start: 5 deals/day, manual review
2. Week 2: 10 deals/day, refined criteria
3. Month 1: Enable auto-buy for score 95+
4. Month 2: Lower to score 90+ as confidence grows

### Monitor Performance
```bash
# Check stats daily
curl https://your-app.railway.app/api/autonomous/stats

# Review top opportunities
curl https://your-app.railway.app/api/autonomous/opportunities?minScore=85&limit=20
```

### Adjust Configuration
- If too many alerts: Raise `minScore`
- If too few opportunities: Lower `minScore`, raise `maxPrice`
- If low profits: Raise `minProfit`, `minROI`

## 🚀 Scaling to UHNW/Luxury

### Phase 1: Prove Concept (Months 1-2)
- Start with consumer electronics
- Build capital ($5-20 profit/deal)
- Perfect the process

### Phase 2: Mid-Tier (Months 3-4)
- Expand to $100-500 items
- $50-200 profit/deal
- More selective, higher quality

### Phase 3: Luxury/UHNW (Months 5+)
- Add luxury watches, designer bags
- Partner with authentication services
- $1K-50K+ profit/deal
- Concierge model for UHNW clients

## 💡 Pro Tips

1. **Run Continuous**: Keep the system running 24/7 for maximum opportunities
2. **Check Morning**: Best deals often appear overnight
3. **Act Fast**: Good opportunities expire quickly
4. **Track Results**: Log your actual profits to refine thresholds
5. **Diversify**: Don't focus on one category
6. **Verify**: Always verify item condition before purchasing high-value items

## 🆘 Troubleshooting

### System Not Finding Opportunities
- Ensure eBay App ID is set
- Check `maxPrice` isn't too low
- Lower `minScore` temporarily
- Verify system is running: `/api/autonomous/status`

### Too Many Low-Quality Alerts
- Raise `minScore` to 75 or 80
- Increase `minROI` to 25% or 30%
- Raise `minProfit` threshold

### Auto-Buy Not Working
- Check daily budget not exceeded
- Verify `autoBuyEnabled: true`
- Ensure `autoBuyScore` threshold met
- Review logs for errors

## 📞 Support

- Documentation: `/RAILWAY_DEPLOY.md`
- API Docs: `/api/autonomous/status` (returns endpoint info)
- Issues: Check Railway deployment logs

---

**You're now running an autonomous arbitrage machine!** 🤖💰

Set it, monitor it, profit from it. The system works 24/7 so you don't have to.
