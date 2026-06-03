#!/bin/bash
# Create ALL 18 curated high-value product listings
# These will be stored in PostgreSQL and persist across restarts

API_URL="https://arbi-production.up.railway.app"

echo "🚀 Creating 18 high-value product listings..."
echo ""

# 1. MacBook Air M2 - HIGHEST PROFIT
curl -s -X POST $API_URL/api/marketplace/list -H "Content-Type: application/json" -d '{
  "opportunityId": "rainforest-B09V3TGD7H",
  "productTitle": "Apple MacBook Air 13-inch M2 Chip 8GB RAM 256GB SSD",
  "productDescription": "2022 MacBook Air with M2 chip, stunning 13.6-inch Liquid Retina display, 1080p FaceTime HD camera, up to 18 hours battery life.",
  "productImageUrls": ["https://m.media-amazon.com/images/I/71ItMeqpN3L.jpg"],
  "supplierPrice": 1199,
  "supplierUrl": "https://www.amazon.com/dp/B09V3TGD7H",
  "supplierPlatform": "amazon",
  "markupPercentage": 35
}' | jq -r '"✅ \(.listing.productTitle) - $\(.listing.marketplacePrice) (Profit: $\(.listing.estimatedProfit))"' || echo "❌ Failed"

# 2. Meta Quest 3
curl -s -X POST $API_URL/api/marketplace/list -H "Content-Type: application/json" -d '{
  "opportunityId": "rainforest-B0C8VKH1ZH",
  "productTitle": "Meta Quest 3 128GB VR Headset",
  "productDescription": "Breakthrough mixed reality headset with 4K+ Infinite Display, powerful performance, and immersive gaming.",
  "productImageUrls": ["https://m.media-amazon.com/images/I/61eusSs1ySL.jpg"],
  "supplierPrice": 499,
  "supplierUrl": "https://www.amazon.com/dp/B0C8VKH1ZH",
  "supplierPlatform": "amazon",
  "markupPercentage": 35
}' | jq -r '"✅ \(.listing.productTitle) - $\(.listing.marketplacePrice) (Profit: $\(.listing.estimatedProfit))"' || echo "❌ Failed"

# 3. iPad 10th Gen
curl -s -X POST $API_URL/api/marketplace/list -H "Content-Type: application/json" -d '{
  "opportunityId": "rainforest-B0BSHF7WHW",
  "productTitle": "Apple iPad 10th Gen 10.9-inch Wi-Fi 64GB",
  "productDescription": "All-new colorful design with 10.9-inch Liquid Retina display, A14 Bionic chip, 12MP front and back cameras.",
  "productImageUrls": ["https://m.media-amazon.com/images/I/61uA2UVnYWL.jpg"],
  "supplierPrice": 349,
  "supplierUrl": "https://www.amazon.com/dp/B0BSHF7WHW",
  "supplierPlatform": "amazon",
  "markupPercentage": 35
}' | jq -r '"✅ \(.listing.productTitle) - $\(.listing.marketplacePrice) (Profit: $\(.listing.estimatedProfit))"' || echo "❌ Failed"

# 4. Nintendo Switch OLED
curl -s -X POST $API_URL/api/marketplace/list -H "Content-Type: application/json" -d '{
  "opportunityId": "rainforest-B098RKWHHZ",
  "productTitle": "Nintendo Switch OLED Model White",
  "productDescription": "Brand new Nintendo Switch OLED with vibrant screen, enhanced audio, and adjustable stand.",
  "productImageUrls": ["https://m.media-amazon.com/images/I/61vKn7NlpeL.jpg"],
  "supplierPrice": 289.99,
  "supplierUrl": "https://www.amazon.com/dp/B098RKWHHZ",
  "supplierPlatform": "amazon",
  "markupPercentage": 50
}' | jq -r '"✅ \(.listing.productTitle) - $\(.listing.marketplacePrice) (Profit: $\(.listing.estimatedProfit))"' || echo "❌ Failed"

# 5. AirPods Pro 2
curl -s -X POST $API_URL/api/marketplace/list -H "Content-Type: application/json" -d '{
  "opportunityId": "rainforest-B0D1XD1ZV3",
  "productTitle": "Apple AirPods Pro 2 with Active Noise Cancellation",
  "productDescription": "New AirPods Pro 2 with H2 chip, active noise cancellation, transparency mode, and USB-C charging.",
  "productImageUrls": ["https://m.media-amazon.com/images/I/61f1YfTkTDL.jpg"],
  "supplierPrice": 199,
  "supplierUrl": "https://www.amazon.com/dp/B0D1XD1ZV3",
  "supplierPlatform": "amazon",
  "markupPercentage": 50
}' | jq -r '"✅ \(.listing.productTitle) - $\(.listing.marketplacePrice) (Profit: $\(.listing.estimatedProfit))"' || echo "❌ Failed"

# 6. Bose QC45
curl -s -X POST $API_URL/api/marketplace/list -H "Content-Type: application/json" -d '{
  "opportunityId": "rainforest-B098FKXT8L",
  "productTitle": "Bose QuietComfort 45 Wireless Noise Cancelling Headphones",
  "productDescription": "Premium wireless headphones with world-class noise cancellation and 24-hour battery life.",
  "productImageUrls": ["https://m.media-amazon.com/images/I/51JtkIxMNwL.jpg"],
  "supplierPrice": 329,
  "supplierUrl": "https://www.amazon.com/dp/B098FKXT8L",
  "supplierPlatform": "amazon",
  "markupPercentage": 30
}' | jq -r '"✅ \(.listing.productTitle) - $\(.listing.marketplacePrice) (Profit: $\(.listing.estimatedProfit))"' || echo "❌ Failed"

# 7. GoPro HERO12
curl -s -X POST $API_URL/api/marketplace/list -H "Content-Type: application/json" -d '{
  "opportunityId": "rainforest-B0BKVLG37Y",
  "productTitle": "GoPro HERO12 Black Action Camera - Waterproof 5.3K60",
  "productDescription": "Latest GoPro with 5.3K60 video, enhanced stabilization, and waterproof to 33ft.",
  "productImageUrls": ["https://m.media-amazon.com/images/I/61-tpmlEG9L.jpg"],
  "supplierPrice": 349,
  "supplierUrl": "https://www.amazon.com/dp/B0BKVLG37Y",
  "supplierPlatform": "amazon",
  "markupPercentage": 30
}' | jq -r '"✅ \(.listing.productTitle) - $\(.listing.marketplacePrice) (Profit: $\(.listing.estimatedProfit))"' || echo "❌ Failed"

# 8. Sony A7 IV - HUGE PROFIT
curl -s -X POST $API_URL/api/marketplace/list -H "Content-Type: application/json" -d '{
  "opportunityId": "rainforest-B0C1SLD8VK",
  "productTitle": "Sony Alpha A7 IV Mirrorless Full-Frame Camera Body",
  "productDescription": "Professional 33MP full-frame mirrorless camera with 4K60p video and advanced autofocus.",
  "productImageUrls": ["https://m.media-amazon.com/images/I/71zDO7JR5kL.jpg"],
  "supplierPrice": 2498,
  "supplierUrl": "https://www.amazon.com/dp/B0C1SLD8VK",
  "supplierPlatform": "amazon",
  "markupPercentage": 30
}' | jq -r '"✅ \(.listing.productTitle) - $\(.listing.marketplacePrice) (Profit: $\(.listing.estimatedProfit))"' || echo "❌ Failed"

# 9. Canon EOS R50
curl -s -X POST $API_URL/api/marketplace/list -H "Content-Type: application/json" -d '{
  "opportunityId": "rainforest-B0CHX7QBZP",
  "productTitle": "Canon EOS R50 Mirrorless Camera with RF-S 18-45mm Lens",
  "productDescription": "Compact mirrorless camera with 24.2MP sensor, 4K video, and vlogging features.",
  "productImageUrls": ["https://m.media-amazon.com/images/I/71w5tGvTEoL.jpg"],
  "supplierPrice": 679,
  "supplierUrl": "https://www.amazon.com/dp/B0CHX7QBZP",
  "supplierPlatform": "amazon",
  "markupPercentage": 30
}' | jq -r '"✅ \(.listing.productTitle) - $\(.listing.marketplacePrice) (Profit: $\(.listing.estimatedProfit))"' || echo "❌ Failed"

# 10. iRobot Roomba j7+
curl -s -X POST $API_URL/api/marketplace/list -H "Content-Type: application/json" -d '{
  "opportunityId": "rainforest-B09V3HYQF5",
  "productTitle": "iRobot Roomba j7+ Self-Emptying Robot Vacuum",
  "productDescription": "Smart robot vacuum with self-emptying base and obstacle avoidance.",
  "productImageUrls": ["https://m.media-amazon.com/images/I/61IUaEzTlwL.jpg"],
  "supplierPrice": 599,
  "supplierUrl": "https://www.amazon.com/dp/B09V3HYQF5",
  "supplierPlatform": "amazon",
  "markupPercentage": 30
}' | jq -r '"✅ \(.listing.productTitle) - $\(.listing.marketplacePrice) (Profit: $\(.listing.estimatedProfit))"' || echo "❌ Failed"

# 11. Ninja CREAMi
curl -s -X POST $API_URL/api/marketplace/list -H "Content-Type: application/json" -d '{
  "opportunityId": "rainforest-B0B7MTDCXL",
  "productTitle": "Ninja CREAMi Ice Cream Maker - 7 Functions",
  "productDescription": "Transform frozen ingredients into ice cream, gelato, and smoothie bowls.",
  "productImageUrls": ["https://m.media-amazon.com/images/I/71z+3qH9T4L.jpg"],
  "supplierPrice": 179,
  "supplierUrl": "https://www.amazon.com/dp/B0B7MTDCXL",
  "supplierPlatform": "amazon",
  "markupPercentage": 35
}' | jq -r '"✅ \(.listing.productTitle) - $\(.listing.marketplacePrice) (Profit: $\(.listing.estimatedProfit))"' || echo "❌ Failed"

# 12. Breville Barista Express
curl -s -X POST $API_URL/api/marketplace/list -H "Content-Type: application/json" -d '{
  "opportunityId": "rainforest-B00I6JGGP0",
  "productTitle": "Breville Barista Express Espresso Machine",
  "productDescription": "Professional-grade espresso machine with built-in grinder and milk frother.",
  "productImageUrls": ["https://m.media-amazon.com/images/I/81SgErRG5mL.jpg"],
  "supplierPrice": 699,
  "supplierUrl": "https://www.amazon.com/dp/B00I6JGGP0",
  "supplierPlatform": "amazon",
  "markupPercentage": 30
}' | jq -r '"✅ \(.listing.productTitle) - $\(.listing.marketplacePrice) (Profit: $\(.listing.estimatedProfit))"' || echo "❌ Failed"

# 13. YETI Tundra 65
curl -s -X POST $API_URL/api/marketplace/list -H "Content-Type: application/json" -d '{
  "opportunityId": "rainforest-B00AEKMHZW",
  "productTitle": "YETI Tundra 65 Hard Cooler - Bear-Resistant",
  "productDescription": "Premium hard cooler with superior ice retention and bear-resistant design.",
  "productImageUrls": ["https://m.media-amazon.com/images/I/81K+5KmUkqL.jpg"],
  "supplierPrice": 375,
  "supplierUrl": "https://www.amazon.com/dp/B00AEKMHZW",
  "supplierPlatform": "amazon",
  "markupPercentage": 30
}' | jq -r '"✅ \(.listing.productTitle) - $\(.listing.marketplacePrice) (Profit: $\(.listing.estimatedProfit))"' || echo "❌ Failed"

# 14. Garmin Fenix 7X
curl -s -X POST $API_URL/api/marketplace/list -H "Content-Type: application/json" -d '{
  "opportunityId": "rainforest-B0B1VR6HRY",
  "productTitle": "Garmin Fenix 7X Sapphire Solar GPS Smartwatch",
  "productDescription": "Premium multisport GPS watch with solar charging and advanced training features.",
  "productImageUrls": ["https://m.media-amazon.com/images/I/61VqJNHZA+L.jpg"],
  "supplierPrice": 899,
  "supplierUrl": "https://www.amazon.com/dp/B0B1VR6HRY",
  "supplierPlatform": "amazon",
  "markupPercentage": 30
}' | jq -r '"✅ \(.listing.productTitle) - $\(.listing.marketplacePrice) (Profit: $\(.listing.estimatedProfit))"' || echo "❌ Failed"

# 15. Ray-Ban Meta Smart Glasses
curl -s -X POST $API_URL/api/marketplace/list -H "Content-Type: application/json" -d '{
  "opportunityId": "rainforest-B0CC2W7CT9",
  "productTitle": "Ray-Ban Meta Smart Glasses - Wayfarer",
  "productDescription": "Smart glasses with built-in camera, open-ear audio, and Meta AI.",
  "productImageUrls": ["https://m.media-amazon.com/images/I/51J7vVYy1SL.jpg"],
  "supplierPrice": 299,
  "supplierUrl": "https://www.amazon.com/dp/B0CC2W7CT9",
  "supplierPlatform": "amazon",
  "markupPercentage": 35
}' | jq -r '"✅ \(.listing.productTitle) - $\(.listing.marketplacePrice) (Profit: $\(.listing.estimatedProfit))"' || echo "❌ Failed"

# 16. Fender Player Stratocaster
curl -s -X POST $API_URL/api/marketplace/list -H "Content-Type: application/json" -d '{
  "opportunityId": "rainforest-B07W7WBNY5",
  "productTitle": "Fender Player Stratocaster Electric Guitar",
  "productDescription": "Classic Stratocaster with modern enhancements and Player Series pickups.",
  "productImageUrls": ["https://m.media-amazon.com/images/I/61bC3-gGy5L.jpg"],
  "supplierPrice": 799,
  "supplierUrl": "https://www.amazon.com/dp/B07W7WBNY5",
  "supplierPlatform": "amazon",
  "markupPercentage": 30
}' | jq -r '"✅ \(.listing.productTitle) - $\(.listing.marketplacePrice) (Profit: $\(.listing.estimatedProfit))"' || echo "❌ Failed"

# 17. Yamaha P-125 Digital Piano
curl -s -X POST $API_URL/api/marketplace/list -H "Content-Type: application/json" -d '{
  "opportunityId": "rainforest-B07W7VD26P",
  "productTitle": "Yamaha P-125 88-Key Weighted Digital Piano",
  "productDescription": "Portable digital piano with 88 weighted keys and realistic sound.",
  "productImageUrls": ["https://m.media-amazon.com/images/I/71vqH+xq6hL.jpg"],
  "supplierPrice": 649,
  "supplierUrl": "https://www.amazon.com/dp/B07W7VD26P",
  "supplierPlatform": "amazon",
  "markupPercentage": 30
}' | jq -r '"✅ \(.listing.productTitle) - $\(.listing.marketplacePrice) (Profit: $\(.listing.estimatedProfit))"' || echo "❌ Failed"

# 18. Roland TD-17KV Electronic Drum Kit
curl -s -X POST $API_URL/api/marketplace/list -H "Content-Type: application/json" -d '{
  "opportunityId": "rainforest-B0843DKH3N",
  "productTitle": "Roland TD-17KV V-Drums Electronic Drum Kit",
  "productDescription": "Professional electronic drum kit with mesh heads and Bluetooth connectivity.",
  "productImageUrls": ["https://m.media-amazon.com/images/I/71J8y3WZq0L.jpg"],
  "supplierPrice": 1699,
  "supplierUrl": "https://www.amazon.com/dp/B0843DKH3N",
  "supplierPlatform": "amazon",
  "markupPercentage": 30
}' | jq -r '"✅ \(.listing.productTitle) - $\(.listing.marketplacePrice) (Profit: $\(.listing.estimatedProfit))"' || echo "❌ Failed"

echo ""
echo "===================================="
echo "📊 CHECKING DATABASE PERSISTENCE..."
echo "===================================="

# Check total listings in database
TOTAL=$(curl -s $API_URL/api/marketplace/listings?status=active | jq '.total')

echo ""
echo "✅ TOTAL LISTINGS IN DATABASE: $TOTAL"
echo ""
echo "🎯 These listings are now stored in PostgreSQL"
echo "   They will persist across Railway restarts!"
echo ""
