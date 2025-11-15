/**
 * Multi-Platform Arbitrage Scout Expansion
 *
 * This document outlines the platforms we can add to ARBI
 * for maximum arbitrage coverage
 *
 * ⚠️  IMPORTANT: REMOTE-ONLY STRATEGY
 * ==================================
 * Current configuration focuses on platforms that SHIP products.
 * Platforms requiring local pickup or physical handling are DISABLED.
 *
 * ✅ ENABLED: eBay, Amazon, Mercari, Poshmark, Walmart, Online Retail
 * ❌ DISABLED: Facebook Marketplace, OfferUp, Craigslist, Local Auctions
 *
 * This allows for 100% remote arbitrage with no physical product handling.
 */

export const PLATFORM_EXPANSION_ROADMAP = {

  // ========================================
  // TIER 1: IMMEDIATE ADDITIONS (This Week)
  // ========================================

  tier1_priority: [
    {
      platform: "Facebook Marketplace",
      difficulty: "Easy",
      api: "No official API (use web scraping)",
      profitPotential: "VERY HIGH",
      volume: "Massive local inventory",
      strategy: "Buy local, sell national (eBay/Amazon)",
      implementation: "Use Puppeteer to scrape search results",
      cost: "$0 (web scraping)",
      timeToImplement: "1-2 days",
      why: "Local sellers don't know market prices - massive arbitrage gaps",
      requiresPhysicalHandling: true,
      status: "DISABLED - Requires local pickup and physical product handling"
    },

    {
      platform: "Mercari",
      difficulty: "Easy",
      api: "No official API (web scraping)",
      profitPotential: "HIGH",
      volume: "100M+ listings",
      strategy: "Buy from casual sellers, resell on eBay/Poshmark",
      implementation: "HTTP requests + cheerio parsing",
      cost: "$0",
      timeToImplement: "1 day",
      why: "Casual sellers price low, quick turnover",
      requiresPhysicalHandling: false,
      status: "READY - Ships nationally, remote-friendly"
    },

    {
      platform: "Poshmark",
      difficulty: "Easy",
      api: "No official API",
      profitPotential: "HIGH (fashion)",
      volume: "200M+ items",
      strategy: "Buy underpriced designer items, resell on eBay/Grailed",
      implementation: "Web scraping",
      cost: "$0",
      timeToImplement: "1 day",
      why: "Fashion arbitrage has 50-200% margins",
      requiresPhysicalHandling: false,
      status: "READY - Ships nationally, remote-friendly"
    },

    {
      platform: "OfferUp",
      difficulty: "Easy",
      api: "No official API",
      profitPotential: "HIGH",
      volume: "Millions of local listings",
      strategy: "Local pickup → national resale",
      implementation: "Web scraping",
      cost: "$0",
      timeToImplement: "1 day",
      why: "Local sellers undervalue items significantly",
      requiresPhysicalHandling: true,
      status: "DISABLED - Requires local pickup and physical product handling"
    },

    {
      platform: "Craigslist",
      difficulty: "Medium",
      api: "No official API (geo-distributed scraping needed)",
      profitPotential: "HIGH",
      volume: "Huge, but fragmented by city",
      strategy: "Local arbitrage + bulk buys",
      implementation: "Multi-city scraper with proxies",
      cost: "$20/month (proxies)",
      timeToImplement: "2-3 days",
      why: "Free to post = desperate sellers = big discounts",
      requiresPhysicalHandling: true,
      status: "DISABLED - Requires local pickup and physical product handling"
    }
  ],

  // ========================================
  // TIER 2: HIGH-VALUE ADDITIONS (Week 2-3)
  // ========================================

  tier2_expansion: [
    {
      platform: "Walmart Marketplace",
      difficulty: "Medium",
      api: "Walmart Open API (requires approval)",
      profitPotential: "VERY HIGH",
      volume: "Millions of products",
      strategy: "Buy Walmart clearance → sell on Amazon/eBay",
      implementation: "Official API + scraping for clearance",
      cost: "$0 (API is free)",
      timeToImplement: "3-5 days (approval time)",
      why: "Walmart clearance is 70-90% off, resell at normal price"
    },

    {
      platform: "AliExpress / Alibaba",
      difficulty: "Easy",
      api: "AliExpress API (dropshipping)",
      profitPotential: "HIGH (volume play)",
      volume: "Unlimited",
      strategy: "Buy bulk from China, sell individually in US",
      implementation: "AliExpress API",
      cost: "$0 (API free)",
      timeToImplement: "2 days",
      why: "Buy for $2, sell for $20 (10x markup common)"
    },

    {
      platform: "Liquidation.com",
      difficulty: "Medium",
      api: "No API (scraping)",
      profitPotential: "EXTREME (500%+ ROI)",
      volume: "Pallets/truckloads",
      strategy: "Buy liquidation pallets → part out and resell",
      implementation: "Web scraping + auction monitoring",
      cost: "$0",
      timeToImplement: "2-3 days",
      why: "$500 pallet → $2,500 in resales (common)"
    },

    {
      platform: "B-Stock / BULQ",
      difficulty: "Medium",
      api: "No API",
      profitPotential: "VERY HIGH",
      volume: "Amazon/Walmart returns by the pallet",
      strategy: "Buy return pallets → test/repair/resell",
      implementation: "Auction scraping",
      cost: "$0",
      timeToImplement: "2-3 days",
      why: "Returns often work fine, bought at 10-20% of retail"
    },

    {
      platform: "Local Auctions (LiveAuctioneers/Invaluable)",
      difficulty: "Hard",
      api: "Limited",
      profitPotential: "EXTREME (antiques/collectibles)",
      volume: "Thousands of auctions daily",
      strategy: "Bid on undervalued items, resell to collectors",
      implementation: "API + real-time bidding bot",
      cost: "$0-50/month",
      timeToImplement: "5-7 days",
      why: "Estate sales have hidden gems, can flip for 10x+"
    }
  ],

  // ========================================
  // TIER 3: SPECIALIZED/ADVANCED (Month 2+)
  // ========================================

  tier3_specialized: [
    {
      platform: "StockX",
      difficulty: "Hard",
      api: "No official API (requires reverse engineering)",
      profitPotential: "EXTREME (sneakers/streetwear)",
      volume: "Limited releases",
      strategy: "Retail arbitrage on sneaker drops",
      implementation: "Puppeteer + proxy rotation",
      cost: "$100/month (proxies + captcha solving)",
      timeToImplement: "1-2 weeks",
      why: "$200 sneakers sell for $1,000+ on StockX"
    },

    {
      platform: "GOAT",
      difficulty: "Hard",
      api: "No API",
      profitPotential: "EXTREME",
      volume: "Sneaker marketplace",
      strategy: "Buy retail, sell at premium",
      implementation: "Scraping + bot checkout",
      cost: "$100/month",
      timeToImplement: "1-2 weeks",
      why: "Same as StockX - sneaker arbitrage"
    },

    {
      platform: "Reverb (Musical Instruments)",
      difficulty: "Medium",
      api: "Official API available",
      profitPotential: "HIGH",
      volume: "Niche but profitable",
      strategy: "Buy undervalued vintage gear",
      implementation: "Reverb API",
      cost: "$0",
      timeToImplement: "3-4 days",
      why: "Vintage guitars/amps have huge margins"
    },

    {
      platform: "TCGPlayer (Trading Cards)",
      difficulty: "Medium",
      api: "Official API",
      profitPotential: "HIGH",
      volume: "Pokemon/MTG cards",
      strategy: "Buy bulk lots → grade & resell singles",
      implementation: "TCGPlayer API",
      cost: "$0",
      timeToImplement: "2-3 days",
      why: "Graded cards sell for 10-100x raw prices"
    },

    {
      platform: "eBay Motors (Auto Parts)",
      difficulty: "Medium",
      api: "eBay API (already have)",
      profitPotential: "HIGH",
      volume: "Massive",
      strategy: "Buy junkyard parts → clean/test/sell",
      implementation: "Category-specific eBay search",
      cost: "$0",
      timeToImplement: "1 day",
      why: "$20 part from junkyard sells for $150 online"
    },

    {
      platform: "Government Auctions (GovDeals)",
      difficulty: "Hard",
      api: "No API",
      profitPotential: "EXTREME",
      volume: "Weekly auctions",
      strategy: "Buy surplus equipment/vehicles at auction",
      implementation: "Scraping + auction bot",
      cost: "$0",
      timeToImplement: "1 week",
      why: "Buy cars for $500, sell for $5,000 (not uncommon)"
    }
  ],

  // ========================================
  // INTERNATIONAL ARBITRAGE
  // ========================================

  international: [
    {
      platform: "AliExpress → US Markets",
      profitPotential: "HIGH",
      strategy: "Dropshipping or bulk import",
      margin: "300-1000%"
    },
    {
      platform: "UK eBay → US eBay",
      profitPotential: "MEDIUM",
      strategy: "Currency arbitrage + regional pricing",
      margin: "20-50%"
    },
    {
      platform: "Japan Yahoo Auctions → US Collectors",
      profitPotential: "EXTREME",
      strategy: "Import rare collectibles",
      margin: "500-2000%"
    }
  ]
};

// ========================================
// IMPLEMENTATION PRIORITY
// ========================================

export const RECOMMENDED_ORDER = [
  "1. Facebook Marketplace (ASAP - Biggest opportunity)",
  "2. Mercari (Easy win, high volume)",
  "3. Walmart API (Clearance arbitrage)",
  "4. Poshmark (Fashion arbitrage)",
  "5. Liquidation.com (Bulk opportunities)",
  "6. AliExpress (International arbitrage)",
  "7. StockX/GOAT (Sneaker game)",
  "8. Government Auctions (Advanced, but huge ROI)"
];

// ========================================
// ESTIMATED REVENUE BY PLATFORM
// ========================================

export const REVENUE_PROJECTIONS_MONTH_1 = {
  "eBay Only": "$500-1,000",
  "+ Facebook Marketplace": "$2,000-3,500",
  "+ Mercari": "$3,000-5,000",
  "+ Walmart": "$4,000-7,000",
  "+ Liquidation": "$6,000-12,000",
  "+ All Platforms": "$10,000-20,000"
};
