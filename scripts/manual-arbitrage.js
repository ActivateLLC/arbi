#!/usr/bin/env node

/**
 * Manual Arbitrage Finder
 * Find profitable arbitrage opportunities without eBay API
 * Run: node scripts/manual-arbitrage.js
 */

const https = require('https');

const RAILWAY_API = 'https://arbi-production.up.railway.app';

// Color codes for terminal
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function makeRequest(url, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          resolve(body);
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

async function checkStatus() {
  log('cyan', '\n📊 Checking ARBI system status...\n');

  try {
    const status = await makeRequest(`${RAILWAY_API}/api/autonomous/status`);

    log('bold', '=== SYSTEM STATUS ===');
    log(status.status === 'running' ? 'green' : 'yellow', `Status: ${status.status.toUpperCase()}`);
    log('blue', `Total Opportunities: ${status.stats?.totalOpportunities || 0}`);
    log('blue', `Uptime: ${Math.floor(status.uptime / 60)} minutes`);

    console.log('\nConfiguration:');
    console.log(`  Min Score: ${status.config.minScore}`);
    console.log(`  Min ROI: ${status.config.minROI}%`);
    console.log(`  Min Profit: $${status.config.minProfit}`);
    console.log(`  Auto-Buy: ${status.config.autoBuyEnabled ? 'ENABLED' : 'DISABLED'}`);

    return status;
  } catch (error) {
    log('red', `❌ Error: ${error.message}`);
    log('yellow', '\n💡 Make sure Railway API is running at:');
    log('yellow', `   ${RAILWAY_API}`);
    return null;
  }
}

async function scanNow() {
  log('cyan', '\n🔍 Triggering manual scan...\n');
  log('yellow', '⚠️  Note: This requires eBay API credentials to be configured');
  log('yellow', '   If scan returns 0 results, eBay API setup is needed\n');

  try {
    const result = await makeRequest(`${RAILWAY_API}/api/autonomous/scan-now`, 'POST');

    if (result.success) {
      log('green', `✅ Scan completed!`);
      log('blue', `Found ${result.opportunitiesFound} opportunities`);

      if (result.opportunities && result.opportunities.length > 0) {
        console.log('\n📦 Top Opportunities:\n');
        result.opportunities.slice(0, 5).forEach((opp, i) => {
          console.log(`${i + 1}. ${opp.product.title}`);
          console.log(`   💰 Profit: $${opp.profit.netProfit.toFixed(2)} (${opp.profit.roi.toFixed(1)}% ROI)`);
          console.log(`   ⭐ Score: ${opp.score.score}/100 (${opp.score.tier})`);
          console.log(`   🔗 ${opp.product.url}\n`);
        });
      }
    } else {
      log('red', `❌ Scan failed: ${result.error || result.details}`);
    }

    return result;
  } catch (error) {
    log('red', `❌ Error: ${error.message}`);
    return null;
  }
}

async function getOpportunities() {
  log('cyan', '\n💎 Fetching current opportunities...\n');

  try {
    const result = await makeRequest(`${RAILWAY_API}/api/autonomous/opportunities?limit=50`);

    if (result.total === 0) {
      log('yellow', '📭 No opportunities found yet');
      log('blue', '\n💡 Tips:');
      log('blue', '   1. Make sure eBay API credentials are configured');
      log('blue', '   2. Run a scan with: node scripts/manual-arbitrage.js scan');
      log('blue', '   3. Or start the autonomous system');
      return;
    }

    log('green', `✅ Found ${result.total} opportunities!\n`);

    // Group by tier
    const byTier = {
      excellent: [],
      high: [],
      medium: [],
      low: []
    };

    result.opportunities.forEach(opp => {
      byTier[opp.score.tier].push(opp);
    });

    // Display excellent tier first
    if (byTier.excellent.length > 0) {
      log('bold', '🌟 EXCELLENT OPPORTUNITIES:');
      byTier.excellent.forEach((opp, i) => {
        displayOpportunity(opp, i + 1);
      });
    }

    if (byTier.high.length > 0) {
      log('bold', '\n⭐ HIGH QUALITY OPPORTUNITIES:');
      byTier.high.slice(0, 10).forEach((opp, i) => {
        displayOpportunity(opp, i + 1);
      });
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    log('bold', 'SUMMARY:');
    console.log(`  🌟 Excellent: ${byTier.excellent.length}`);
    console.log(`  ⭐ High: ${byTier.high.length}`);
    console.log(`  ⚡ Medium: ${byTier.medium.length}`);
    console.log(`  📊 Low: ${byTier.low.length}`);
    console.log('='.repeat(60));

    // Calculate total potential profit
    const totalProfit = result.opportunities.reduce((sum, opp) => sum + opp.profit.netProfit, 0);
    log('green', `\n💰 Total Potential Profit: $${totalProfit.toFixed(2)}`);

  } catch (error) {
    log('red', `❌ Error: ${error.message}`);
  }
}

function displayOpportunity(opp, index) {
  console.log(`\n${index}. ${colors.bold}${opp.product.title}${colors.reset}`);
  console.log(`   🏷️  Buy: $${opp.profit.sourcePrice} → Sell: $${opp.profit.targetPrice}`);
  console.log(`   💵 Net Profit: ${colors.green}$${opp.profit.netProfit.toFixed(2)}${colors.reset} (${opp.profit.roi.toFixed(1)}% ROI)`);
  console.log(`   ⭐ Score: ${opp.score.score}/100 (${opp.score.tier}) - ${opp.score.confidence}% confidence`);
  console.log(`   ✅ Green Flags: ${opp.score.greenFlags.join(', ')}`);
  if (opp.score.redFlags.length > 0) {
    console.log(`   ⚠️  Red Flags: ${opp.score.redFlags.join(', ')}`);
  }
  console.log(`   🔗 ${opp.product.url}`);
}

async function startSystem() {
  log('cyan', '\n🚀 Starting autonomous system...\n');

  try {
    const result = await makeRequest(`${RAILWAY_API}/api/autonomous/start`, 'POST', {
      config: {
        minScore: 70,
        minROI: 20,
        minProfit: 5,
        scanInterval: 15,
        autoBuyEnabled: false
      }
    });

    if (result.success) {
      log('green', '✅ Autonomous system started!');
      log('blue', `Initial opportunities: ${result.initialOpportunities}`);
      log('yellow', '\n💡 The system will scan every 15 minutes');
      log('yellow', '   Run "node scripts/manual-arbitrage.js list" to see opportunities');
    } else {
      log('red', `❌ Failed to start: ${result.error}`);
    }
  } catch (error) {
    log('red', `❌ Error: ${error.message}`);
  }
}

async function stopSystem() {
  log('cyan', '\n🛑 Stopping autonomous system...\n');

  try {
    const result = await makeRequest(`${RAILWAY_API}/api/autonomous/stop`, 'POST');

    if (result.success) {
      log('green', '✅ System stopped');
      console.log('\nFinal Stats:');
      console.log(`  Total Opportunities: ${result.finalStats.totalOpportunities}`);
      console.log(`  Total Purchases: ${result.finalStats.totalPurchases}`);
    } else {
      log('yellow', result.error);
    }
  } catch (error) {
    log('red', `❌ Error: ${error.message}`);
  }
}

// Main CLI
async function main() {
  const command = process.argv[2] || 'status';

  log('bold', '\n🤖 ARBI Manual Arbitrage CLI\n');

  switch (command.toLowerCase()) {
    case 'status':
      await checkStatus();
      break;

    case 'scan':
      await scanNow();
      break;

    case 'list':
    case 'opportunities':
      await getOpportunities();
      break;

    case 'start':
      await startSystem();
      break;

    case 'stop':
      await stopSystem();
      break;

    case 'help':
      console.log('Available commands:');
      console.log('  status        - Check system status (default)');
      console.log('  scan          - Run immediate scan for opportunities');
      console.log('  list          - List all current opportunities');
      console.log('  start         - Start autonomous scanning');
      console.log('  stop          - Stop autonomous scanning');
      console.log('  help          - Show this help');
      console.log('\nExamples:');
      console.log('  node scripts/manual-arbitrage.js');
      console.log('  node scripts/manual-arbitrage.js scan');
      console.log('  node scripts/manual-arbitrage.js list');
      break;

    default:
      log('red', `Unknown command: ${command}`);
      log('yellow', 'Run with "help" to see available commands');
  }

  console.log(); // Empty line at end
}

main().catch(error => {
  log('red', `Fatal error: ${error.message}`);
  process.exit(1);
});
