import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create sample listings
  const listings = [
    {
      title: 'Premium Wireless Headphones',
      price: 79.99,
      profitMargin: 45,
      category: 'Electronics',
      url: 'https://arbi.creai.dev/product/1',
      status: 'active',
    },
    {
      title: 'Smart Fitness Tracker Watch',
      price: 49.99,
      profitMargin: 40,
      category: 'Wearables',
      url: 'https://arbi.creai.dev/product/2',
      status: 'active',
    },
    {
      title: 'Portable Phone Charger 20000mAh',
      price: 34.99,
      profitMargin: 38,
      category: 'Accessories',
      url: 'https://arbi.creai.dev/product/3',
      status: 'active',
    },
    {
      title: 'Bluetooth Speaker Waterproof',
      price: 59.99,
      profitMargin: 42,
      category: 'Electronics',
      url: 'https://arbi.creai.dev/product/4',
      status: 'active',
    },
    {
      title: 'Laptop Stand Ergonomic',
      price: 39.99,
      profitMargin: 50,
      category: 'Office',
      url: 'https://arbi.creai.dev/product/5',
      status: 'active',
    },
  ];

  for (const listing of listings) {
    await prisma.listing.upsert({
      where: { id: listing.url }, // Use URL as unique identifier
      update: listing,
      create: listing,
    });
  }

  console.log('✅ Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
