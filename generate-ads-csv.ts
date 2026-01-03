/**
 * Generate Google Ads CSV Import File
 * For Sony Alpha A7 IV Camera Campaign
 */

import * as fs from 'fs';

const campaign = {
  productName: 'Sony Alpha A7 IV Camera',
  landingUrl: 'https://api.arbi.creai.dev/product/listing_1766360580855_24nluy3za',
  dailyBudget: 60,
  headlines: [
    'Sony A7 IV - $3,247',
    '33MP Full-Frame - $812/mo',
    'Pro Camera - Free Shipping',
    'Sony A7 IV - 4K60p Video',
    'Shop Sony A7 IV Today',
    'Professional Mirrorless',
    'Limited Stock - Order Now',
    'Sony A7 IV Body - Best Price',
    'Pay $812/mo with Klarna',
    'Sony Alpha A7 IV Camera',
  ],
  descriptions: [
    'Sony Alpha A7 IV 33MP full-frame camera. 4K60p video. Professional autofocus. Shop now!',
    'Professional 33MP mirrorless camera with 4K60p video. Pay $812/month. Free shipping.',
    'Full-frame Sony A7 IV camera body. Advanced autofocus. Secure checkout. Fast delivery.',
    'Get the Sony A7 IV for $3,247. Pro-level 33MP sensor. Limited stock available today.',
    '33MP full-frame sensor. 4K60p video. Real-time AF tracking. Best price guaranteed.',
  ],
};

// Create simple text file with campaign details
const output = `
═══════════════════════════════════════════════════════════════
GOOGLE ADS CAMPAIGN - SONY ALPHA A7 IV CAMERA
═══════════════════════════════════════════════════════════════

📊 CAMPAIGN SETUP

Campaign Name: Sony A7 IV Camera - High Profit
Campaign Type: Performance Max
Daily Budget: $${campaign.dailyBudget}
Bidding Strategy: Maximize Conversions
Target ROAS: 400%
Location: United States
Language: English

═══════════════════════════════════════════════════════════════

🔗 CAMPAIGN URL

Final URL: ${campaign.landingUrl}

═══════════════════════════════════════════════════════════════

📝 HEADLINES (Copy & Paste into Google Ads)

${campaign.headlines.map((h, i) => `Headline ${i + 1}: ${h}`).join('\n')}

═══════════════════════════════════════════════════════════════

📄 DESCRIPTIONS (Copy & Paste into Google Ads)

${campaign.descriptions.map((d, i) => `Description ${i + 1}: ${d}`).join('\n')}

═══════════════════════════════════════════════════════════════

🎯 AUDIENCE SIGNALS

Add these interests:
- Photography
- Videography
- Content Creation
- Professional Photography
- Wedding Photography
- YouTube Creators

Demographics:
- Age: 25-65
- Income: Top 30%

═══════════════════════════════════════════════════════════════

❌ NEGATIVE KEYWORDS

Add these to prevent wasted spend:
-used
-refurbished
-rental
-repair
-broken
-parts
-fake
-replica
-manual
-guide

═══════════════════════════════════════════════════════════════

💰 REVENUE PROJECTIONS

Product Price: $3,247.40
Profit Per Sale: $749.40
Sales Needed for $10K: 14 sales

Scenarios:
- Conservative: $420 cost/sale → 4 sales/month → $2,997 profit/month
- Moderate: $180 cost/sale → 10 sales/month → $7,494 profit/month
- Optimistic: $90 cost/sale → 20 sales/month → $14,988 profit/month ✅

═══════════════════════════════════════════════════════════════

✅ QUICK SETUP STEPS

1. Go to Google Ads → Campaigns → New Campaign
2. Choose "Performance Max" campaign type
3. Set goal to "Sales"
4. Set daily budget to $${campaign.dailyBudget}
5. Choose "Maximize Conversions" bidding
6. (Optional) Set Target ROAS to 400%
7. Set location to "United States"
8. Set language to "English"
9. Add Final URL: ${campaign.landingUrl}
10. Copy/paste all headlines above
11. Copy/paste all descriptions above
12. Add audience signals (Photography, Content Creation, etc.)
13. Add negative keywords
14. Review and publish!

═══════════════════════════════════════════════════════════════
`;

// Save to file
fs.writeFileSync('google-ads-campaign-sony-a7iv.txt', output);

console.log('✅ Campaign details saved to: google-ads-campaign-sony-a7iv.txt');
console.log('');
console.log('📋 Next steps:');
console.log('   1. Open the file in your text editor');
console.log('   2. Copy/paste the headlines and descriptions into Google Ads');
console.log('   3. Follow the quick setup steps in the file');
console.log('');
console.log('🎯 This campaign targets your HIGHEST profit product ($749.40 per sale)');
console.log('   Just 14 sales = $10,491 profit! 🚀');
console.log('');
