// Generate product page links for all listings
async function generateLinks() {
  console.log('\n🔗 PRODUCT PAGE LINKS\n');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const response = await fetch('http://localhost:3000/api/marketplace/listings');
  const data = await response.json();

  if (data.total === 0) {
    console.log('❌ No listings found!');
    return;
  }

  const baseUrl = 'http://api.arbi.creai.dev';
  const localUrl = 'http://localhost:3000';

  console.log(`Found ${data.total} active listings:\n`);

  data.listings.forEach((listing, index) => {
    console.log(`\n${index + 1}. ${listing.productTitle}`);
    console.log(`   💰 Price: $${listing.marketplacePrice.toFixed(2)}`);
    console.log(`   📈 Profit: $${listing.estimatedProfit.toFixed(2)}`);
    console.log(`   🖼️  Images: ${listing.productImages.length}`);
    console.log(`   \n   🔗 Product Page:`);
    console.log(`      Production: ${baseUrl}/product/${listing.listingId}`);
    console.log(`      Local:      ${localUrl}/product/${listing.listingId}`);
    console.log(`\n   ───────────────────────────────────────────────────────────`);
  });

  console.log('\n\n📊 SUMMARY:');
  console.log(`   Total Products: ${data.total}`);
  console.log(`   Total Revenue Potential: $${data.listings.reduce((sum, l) => sum + l.marketplacePrice, 0).toFixed(2)}`);
  console.log(`   Total Profit Potential: $${data.listings.reduce((sum, l) => sum + l.estimatedProfit, 0).toFixed(2)}`);

  console.log('\n\n🎬 NEXT: Video Ad Generation');
  console.log('   Each product can have automated video ads generated');
  console.log(`   Video API Endpoint: ${baseUrl}/product/{listingId}/video`);
  console.log('\n═══════════════════════════════════════════════════════════════\n');

  // Test one product page
  const firstListing = data.listings[0];
  console.log(`\n🧪 Testing product page: ${firstListing.productTitle.substring(0, 50)}...`);
  const testResponse = await fetch(`${localUrl}/product/${firstListing.listingId}`);
  if (testResponse.ok) {
    console.log(`✅ Product page is working! Status: ${testResponse.status}`);
  } else {
    console.log(`❌ Product page failed! Status: ${testResponse.status}`);
  }
}

generateLinks().catch(console.error);
