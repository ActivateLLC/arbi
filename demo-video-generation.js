// Demonstrate automated video ad generation
console.log('\n🎬 AUTOMATED VIDEO AD GENERATION DEMO\n');
console.log('═══════════════════════════════════════════════════════════════\n');

async function generateVideoAd() {
  // Get first listing
  const listingsResponse = await fetch('http://localhost:3000/api/marketplace/listings');
  const listingsData = await listingsResponse.json();

  if (listingsData.total === 0) {
    console.log('❌ No listings found');
    return;
  }

  const listing = listingsData.listings[0];

  console.log(`📦 Selected Product:\n   ${listing.productTitle}`);
  console.log(`   💰 Price: $${listing.marketplacePrice.toFixed(2)}`);
  console.log(`   📈 Profit: $${listing.estimatedProfit.toFixed(2)}\n`);

  console.log('🎥 Generating Modern UGC-Style Video Ad...\n');
  console.log('   ⏳ This uses AI to generate:');
  console.log('      • Scroll-stopping hook');
  console.log('      • Product benefits');
  console.log('      • Professional video composition');
  console.log('      • Captions for sound-off viewing\n');

  try {
    const response = await fetch(`http://localhost:3000/api/generate-video/${listing.listingId}/modern`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        format: 'deal-discovery',
        orientation: 'horizontal',
        duration: 15,
        generateVariations: false
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log(`\n❌ Video generation failed:`, errorText.substring(0, 200));

      console.log('\n\n💡 VIDEO GENERATION CAPABILITIES:\n');
      console.log('   ✅ Automated video ad creation for every product');
      console.log('   ✅ AI-generated hooks that stop scrolling');
      console.log('   ✅ Multiple templates:');
      console.log('      • deal-discovery (Limited Time Offer style)');
      console.log('      • problem-solution (Before/After style)');
      console.log('      • gift-idea (Perfect Gift style)');
      console.log('      • day-in-life (Lifestyle integration)');
      console.log('   ✅ A/B testing with hook variations');
      console.log('   ✅ Optimized for Facebook, Google, TikTok Ads\n');

      console.log('   📹 Example Video Endpoints:');
      console.log(`      POST /api/generate-video/${listing.listingId}/modern`);
      console.log(`      POST /api/generate-video/${listing.listingId}  (classic)`);
      console.log(`      POST /api/generate-video/batch  (multiple products)\n`);

      return;
    }

    const result = await response.json();

    console.log('\n✅ VIDEO GENERATED SUCCESSFULLY!\n');
    console.log('   🎯 Hook Generated:');
    console.log(`      "${result.hooks.primaryHook}"\n`);
    console.log('   💡 Benefits Highlighted:');
    result.hooks.benefits.slice(0, 3).forEach((benefit, i) => {
      console.log(`      ${i + 1}. ${benefit}`);
    });
    console.log(`\n   🎬 Video Details:`);
    console.log(`      URL: ${result.video.url}`);
    console.log(`      Thumbnail: ${result.video.thumbnail}`);
    console.log(`      Duration: ${result.video.duration}s`);
    console.log(`      Size: ${result.video.width}x${result.video.height}`);
    console.log(`      Style: ${result.video.style}`);

    console.log('\n   🚀 Performance Tips:');
    result.tips.forEach(tip => console.log(`      • ${tip}`));

  } catch (error) {
    console.log(`\n❌ Error: ${error.message}`);
  }

  console.log('\n\n═══════════════════════════════════════════════════════════════\n');
}

generateVideoAd().catch(console.error);
