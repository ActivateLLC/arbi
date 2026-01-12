// Seed sample listings to the running API server
// NOTE: Don't set listingId - let the API generate it
const listings = [
  {
    opportunityId: 'opp-001',
    productTitle: 'Sony Alpha A7 IV Mirrorless Full-Frame Camera Body',
    productDescription: 'Premium dual-motor standing desk with memory presets. 72 inch wide workspace. Smooth height adjustment, cable management system, anti-collision technology. Transform your workspace with professional-grade ergonomics. Free shipping, 30-day returns.',
    productImages: ['https://res.cloudinary.com/dyfumzftc/image/upload/v1766360580/arbi-marketplace/rainforest-B0C1SLD8VK-1766360579352.webp'],
    supplierPrice: 1998.00,
    supplierUrl: 'https://amazon.com/dp/B0C1SLD8VK',
    supplierPlatform: 'amazon',
    marketplacePrice: 2747.40,
    estimatedProfit: 749.40,
    status: 'active'
  },
  {
    opportunityId: 'opp-002',
    productTitle: 'Apple MacBook Air 13-inch M2 Chip 8GB RAM 256GB SSD',
    productDescription: 'Ultra-portable MacBook Air with Apple M2 chip for incredible performance. 13.6-inch Liquid Retina display, 8GB unified memory, 256GB SSD storage. All-day battery life. Perfect for productivity, creative work, and entertainment. Free shipping, 30-day returns.',
    productImages: ['https://res.cloudinary.com/dyfumzftc/image/upload/v1766360506/arbi-marketplace/rainforest-B09V3TGD7H-1766360505501.jpg'],
    supplierPrice: 949.00,
    supplierUrl: 'https://amazon.com/dp/B09V3TGD7H',
    supplierPlatform: 'amazon',
    marketplacePrice: 1368.65,
    estimatedProfit: 419.65,
    status: 'active'
  },
  {
    opportunityId: 'opp-003',
    productTitle: 'Garmin Fenix 7X Sapphire Solar GPS Smartwatch',
    productDescription: 'Premium multisport GPS smartwatch with solar charging. Sapphire crystal display, advanced health monitoring, 60+ sport modes. Ultra-rugged design with titanium bezel. 28-day battery life with solar charging. Perfect for athletes and outdoor enthusiasts.',
    productImages: ['https://res.cloudinary.com/dyfumzftc/image/upload/v1766360664/arbi-marketplace/rainforest-B0B1VR6HRY-1766360664090.webp'],
    supplierPrice: 799.99,
    supplierUrl: 'https://amazon.com/dp/B0B1VR6HRY',
    supplierPlatform: 'amazon',
    marketplacePrice: 1069.69,
    estimatedProfit: 269.70,
    status: 'active'
  },
  {
    opportunityId: 'opp-004',
    productTitle: 'Breville Barista Express Espresso Machine',
    productDescription: 'Professional-grade espresso machine with built-in conical burr grinder. 15 bar Italian pump, precise espresso extraction. Create café-quality espresso, cappuccino, and latte at home. Stainless steel construction. Includes milk frother and tamper.',
    productImages: ['https://res.cloudinary.com/dyfumzftc/image/upload/v1766360637/arbi-marketplace/rainforest-B00I6JGGP0-1766360636808.webp'],
    supplierPrice: 549.95,
    supplierUrl: 'https://amazon.com/dp/B00I6JGGP0',
    supplierPlatform: 'amazon',
    marketplacePrice: 759.65,
    estimatedProfit: 209.70,
    status: 'active'
  },
  {
    opportunityId: 'opp-005',
    productTitle: 'Canon EOS R50 Mirrorless Camera with RF-S 18-45mm Lens',
    productDescription: 'Compact mirrorless camera perfect for content creators. 24.2MP APS-C sensor, 4K video, advanced autofocus. Includes RF-S 18-45mm versatile zoom lens. Lightweight design, vlogging features, wireless connectivity. Great for photos and video.',
    productImages: ['https://res.cloudinary.com/dyfumzftc/image/upload/v1766360594/arbi-marketplace/rainforest-B0CHX7QBZP-1766360593960.webp'],
    supplierPrice: 649.00,
    supplierUrl: 'https://amazon.com/dp/B0CHX7QBZP',
    supplierPlatform: 'amazon',
    marketplacePrice: 852.70,
    estimatedProfit: 203.70,
    status: 'active'
  },
  {
    opportunityId: 'opp-006',
    productTitle: 'Apple MacBook Air 13-inch M2 Chip 256GB',
    productDescription: 'Stunningly thin and light MacBook Air powered by M2 chip. Perfect for students, professionals, and creative work. All-day battery life, fanless design. Includes MagSafe charging, two Thunderbolt ports. macOS Ventura with powerful productivity apps.',
    productImages: [
      'https://res.cloudinary.com/dyfumzftc/image/upload/v1766517472/arbi-marketplace/opp_macbook_air_m2-1766517471467.webp',
      'https://res.cloudinary.com/dyfumzftc/image/upload/v1766517475/arbi-marketplace/opp_macbook_air_m2-1766517474540.webp'
    ],
    supplierPrice: 949.00,
    supplierUrl: 'https://amazon.com/dp/B09V3TGD7H',
    supplierPlatform: 'amazon',
    marketplacePrice: 1068.88,
    estimatedProfit: 119.88,
    status: 'active'
  },
  {
    opportunityId: 'opp-007',
    productTitle: 'Electric Standing Desk Pro 72 inch - Dual Motor',
    productDescription: 'Premium dual-motor standing desk with memory presets. 72 inch wide workspace provides ample room for multiple monitors and equipment. Smooth height adjustment from 28-48 inches. Cable management system keeps workspace organized. Anti-collision technology for safety. Professional-grade ergonomics.',
    productImages: [],
    supplierPrice: 449.99,
    supplierUrl: 'https://amazon.com/dp/EXAMPLE',
    supplierPlatform: 'amazon',
    marketplacePrice: 600.66,
    estimatedProfit: 150.67,
    status: 'active'
  }
];

async function seedListings() {
  console.log('🌱 Seeding listings to API server...');

  for (const listing of listings) {
    try {
      const payload = {
        ...listing,
        listedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      };

      const response = await fetch('http://localhost:3000/api/marketplace/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`✅ Created: ${listing.productTitle.substring(0, 50)}...`);
      } else {
        const error = await response.text();
        console.log(`❌ Failed: ${listing.productTitle.substring(0, 50)}... - ${error}`);
      }
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
    }
  }

  console.log('\n📊 Checking listings...');
  const response = await fetch('http://localhost:3000/api/marketplace/listings');
  const data = await response.json();
  console.log(`Total listings: ${data.total}`);
  console.log('\n✅ Seeding complete!');
}

seedListings().catch(console.error);
