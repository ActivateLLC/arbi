#!/bin/bash
# Quick script to list all 18 curated products

API_URL="https://arbi-production.up.railway.app"

# MacBook Air M2 - HIGHEST PROFIT
curl -s -X POST $API_URL/api/marketplace/list -H "Content-Type: application/json" -d '{
  "opportunityId": "rainforest-B09V3TGD7H",
  "productTitle": "Apple MacBook Air 13-inch M2 Chip 8GB RAM 256GB SSD",
  "productDescription": "2022 MacBook Air with M2 chip, stunning 13.6-inch Liquid Retina display, 1080p FaceTime HD camera, up to 18 hours battery life. Perfect for work and creative projects.",
  "productImageUrls": ["https://m.media-amazon.com/images/I/71ItMeqpN3L.jpg"],
  "supplierPrice": 1199,
  "supplierUrl": "https://www.amazon.com/dp/B09V3TGD7H",
  "supplierPlatform": "amazon",
  "markupPercentage": 35
}' | jq -r '"\(.listing.productTitle) - $\(.listing.marketplacePrice) (Profit: $\(.listing.estimatedProfit))"'

echo "---"

# Meta Quest 3
curl -s -X POST $API_URL/api/marketplace/list -H "Content-Type: application/json" -d '{
  "opportunityId": "rainforest-B0C8VKH1ZH",
  "productTitle": "Meta Quest 3 128GB VR Headset",
  "productDescription": "Breakthrough mixed reality headset with 4K+ Infinite Display, powerful performance, and immersive gaming. Includes Touch Plus controllers.",
  "productImageUrls": ["https://m.media-amazon.com/images/I/61eusSs1ySL.jpg"],
  "supplierPrice": 499,
  "supplierUrl": "https://www.amazon.com/dp/B0C8VKH1ZH",
  "supplierPlatform": "amazon",
  "markupPercentage": 35
}' | jq -r '"\(.listing.productTitle) - $\(.listing.marketplacePrice) (Profit: $\(.listing.estimatedProfit))"'

echo "---"

# iPad 10th Gen
curl -s -X POST $API_URL/api/marketplace/list -H "Content-Type: application/json" -d '{
  "opportunityId": "rainforest-B0BSHF7WHW",
  "productTitle": "Apple iPad 10th Gen 10.9-inch Wi-Fi 64GB",
  "productDescription": "All-new colorful design with 10.9-inch Liquid Retina display, A14 Bionic chip, 12MP front and back cameras. Perfect for creativity and productivity.",
  "productImageUrls": ["https://m.media-amazon.com/images/I/61uA2UVnYWL.jpg"],
  "supplierPrice": 349,
  "supplierUrl": "https://www.amazon.com/dp/B0BSHF7WHW",
  "supplierPlatform": "amazon",
  "markupPercentage": 35
}' | jq -r '"\(.listing.productTitle) - $\(.listing.marketplacePrice) (Profit: $\(.listing.estimatedProfit))"'

echo "=== Listings Created ==="
curl -s $API_URL/api/marketplace/listings?status=active | jq '.total'
