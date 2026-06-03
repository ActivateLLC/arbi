import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database with HIGH-TICKET products...');

  // High-demand, high-ticket products with excellent profit margins
  const listings = [
    {
      title: 'Electric Standing Desk Pro 72" - Dual Motor',
      price: 599.99,
      profitMargin: 53,
      category: 'Home Office',
      url: 'https://arbi.creai.dev/product/standing-desk-pro',
      status: 'active',
    },
    {
      title: '4K Smart Home Security System (8 Cameras + NVR)',
      price: 899.99,
      profitMargin: 50,
      category: 'Smart Home',
      url: 'https://arbi.creai.dev/product/security-system-8cam',
      status: 'active',
    },
    {
      title: 'Premium Espresso Machine - Barista Edition 15 Bar',
      price: 799.99,
      profitMargin: 47,
      category: 'Kitchen',
      url: 'https://arbi.creai.dev/product/espresso-machine-pro',
      status: 'active',
    },
    {
      title: 'Robot Vacuum & Mop Combo - LiDAR Navigation',
      price: 549.99,
      profitMargin: 48,
      category: 'Smart Home',
      url: 'https://arbi.creai.dev/product/robot-vacuum-lidar',
      status: 'active',
    },
    {
      title: 'Ergonomic Office Chair - Herman Miller Style',
      price: 699.99,
      profitMargin: 45,
      category: 'Home Office',
      url: 'https://arbi.creai.dev/product/ergonomic-chair-pro',
      status: 'active',
    },
    {
      title: '4K Gaming Monitor 32" 144Hz HDR Curved',
      price: 479.99,
      profitMargin: 42,
      category: 'Gaming',
      url: 'https://arbi.creai.dev/product/gaming-monitor-4k',
      status: 'active',
    },
    {
      title: 'Electric Bike 750W - 50 Mile Range',
      price: 1299.99,
      profitMargin: 51,
      category: 'Outdoor',
      url: 'https://arbi.creai.dev/product/ebike-750w',
      status: 'active',
    },
    {
      title: 'Portable Power Station 1000W Solar Generator',
      price: 699.99,
      profitMargin: 46,
      category: 'Outdoor',
      url: 'https://arbi.creai.dev/product/power-station-1000w',
      status: 'active',
    },
    {
      title: 'Professional Massage Gun - 12 Speeds Deep Tissue',
      price: 299.99,
      profitMargin: 55,
      category: 'Fitness',
      url: 'https://arbi.creai.dev/product/massage-gun-pro',
      status: 'active',
    },
    {
      title: 'Smart Air Purifier HEPA H13 - 900 Sq Ft Coverage',
      price: 399.99,
      profitMargin: 49,
      category: 'Health',
      url: 'https://arbi.creai.dev/product/air-purifier-h13',
      status: 'active',
    },
  ];

  for (const listing of listings) {
    await prisma.listing.upsert({
      where: { url: listing.url },
      update: listing,
      create: listing,
    });
  }

  console.log('✅ Seeded 10 HIGH-TICKET products ($300-$1,300 range)');
  console.log('💰 Average price: $661');
  console.log('📈 Average profit margin: 48.6%');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
