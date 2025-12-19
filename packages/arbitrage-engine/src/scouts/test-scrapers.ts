import { WebScraperScout } from './WebScraperScout';

/**
 * Test scraper functionality before deployment
 * Run: npx ts-node test-scrapers.ts
 */

async function testScrapers() {
  const scout = new WebScraperScout();
  
  console.log('🧪 Testing global retailer scrapers...\n');
  
  const results: { name: string; status: 'PASS' | 'FAIL'; productsFound: number; error?: string }[] = [];
  
  // Test each scraper individually
  const scrapers = [
    { name: 'Walmart US', test: async () => (scout as any).scrapeWalmartClearance() },
    { name: 'Best Buy US', test: async () => (scout as any).scrapeBestBuyOpenBox() },
    { name: 'Target US', test: async () => (scout as any).scrapeTargetClearance() },
    { name: 'Home Depot US', test: async () => (scout as any).scrapeHomeDepotClearance() },
    { name: 'Kohls US', test: async () => (scout as any).scrapeKohlsClearance() },
    { name: 'MediaMarkt DE', test: async () => (scout as any).scrapeMediaMarkt() },
    { name: 'Argos UK', test: async () => (scout as any).scrapeArgos() },
    { name: 'Zalando EU', test: async () => (scout as any).scrapeZalando() },
    { name: 'Saturn DE', test: async () => (scout as any).scrapeSaturn() },
    { name: 'Rakuten JP', test: async () => (scout as any).scrapeRakuten() },
    { name: 'Lazada SEA', test: async () => (scout as any).scrapeLazada() },
    { name: 'Shopee SEA', test: async () => (scout as any).scrapeShopee() },
    { name: 'JD.com CN', test: async () => (scout as any).scrapeJD() },
    { name: 'MercadoLibre MX', test: async () => (scout as any).scrapeMercadoLibre() },
    { name: 'B2W Brazil', test: async () => (scout as any).scrapeB2W() },
    { name: 'JB Hi-Fi AU', test: async () => (scout as any).scrapeJBHiFi() },
    { name: 'Harvey Norman AU', test: async () => (scout as any).scrapeHarveyNorman() },
    { name: 'Noon UAE', test: async () => (scout as any).scrapeNoon() },
    { name: 'Jumbo UAE', test: async () => (scout as any).scrapeJumbo() }
  ];

  for (const scraper of scrapers) {
    try {
      console.log(`Testing ${scraper.name}...`);
      const products = await Promise.race([
        scraper.test(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 20000))
      ]) as any[];
      
      if (products && products.length > 0) {
        results.push({ name: scraper.name, status: 'PASS', productsFound: products.length });
        console.log(`  ✅ PASS: ${products.length} products found`);
      } else {
        results.push({ name: scraper.name, status: 'FAIL', productsFound: 0, error: 'No products returned' });
        console.log(`  ❌ FAIL: No products found`);
      }
    } catch (error: any) {
      results.push({ name: scraper.name, status: 'FAIL', productsFound: 0, error: error.message });
      console.log(`  ❌ FAIL: ${error.message}`);
    }
  }

  // Summary
  console.log('\n📊 Test Summary:');
  console.log('================');
  const passed = results.filter(r => r.status === 'PASS');
  const failed = results.filter(r => r.status === 'FAIL');
  
  console.log(`✅ Passed: ${passed.length}/${results.length}`);
  console.log(`❌ Failed: ${failed.length}/${results.length}`);
  
  if (passed.length > 0) {
    console.log('\n✅ Working scrapers:');
    passed.forEach(r => console.log(`  - ${r.name} (${r.productsFound} products)`));
  }
  
  if (failed.length > 0) {
    console.log('\n❌ Failed scrapers:');
    failed.forEach(r => console.log(`  - ${r.name}: ${r.error}`));
  }
  
  // Generate config for production
  const workingScrapers = passed.map(r => r.name);
  console.log('\n🔧 Recommended production config:');
  console.log('Only enable these scrapers:', workingScrapers);
  
  process.exit(failed.length === results.length ? 1 : 0);
}

testScrapers().catch(console.error);
