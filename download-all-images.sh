#!/bin/bash

# 🖼️ Download All Product Images for Ad Campaigns
# Downloads all Cloudinary images organized by product

echo "════════════════════════════════════════════════════════"
echo "🖼️  Downloading Product Images for Campaigns"
echo "════════════════════════════════════════════════════════"
echo ""

# Create download directory
mkdir -p product-images
cd product-images

# Top profit products with images
echo "📦 Downloading TOP PROFIT products..."
echo ""

# Sony Alpha A7 IV - $749.40 profit
mkdir -p "sony-a7iv-749"
echo "1. Sony Alpha A7 IV ($749.40 profit)"
curl -sL "https://res.cloudinary.com/dyfumzftc/image/upload/v1766360580/arbi-marketplace/rainforest-B0C1SLD8VK-1766360579352.webp" -o "sony-a7iv-749/image-1.webp"
echo "   ✅ 1 image downloaded"

# Apple MacBook Air M2 - $419.65 profit
mkdir -p "macbook-air-m2-420"
echo "2. Apple MacBook Air M2 ($419.65 profit)"
curl -sL "https://res.cloudinary.com/dyfumzftc/image/upload/v1766360506/arbi-marketplace/rainforest-B09V3TGD7H-1766360505501.jpg" -o "macbook-air-m2-420/image-1.jpg"
echo "   ✅ 1 image downloaded"

# Garmin Fenix 7X - $269.70 profit
mkdir -p "garmin-fenix-7x-270"
echo "3. Garmin Fenix 7X ($269.70 profit)"
curl -sL "https://res.cloudinary.com/dyfumzftc/image/upload/v1766360664/arbi-marketplace/rainforest-B0B1VR6HRY-1766360664090.webp" -o "garmin-fenix-7x-270/image-1.webp"
echo "   ✅ 1 image downloaded"

# Breville Barista Express - $209.70 profit
mkdir -p "breville-espresso-210"
echo "4. Breville Barista Express ($209.70 profit)"
curl -sL "https://res.cloudinary.com/dyfumzftc/image/upload/v1766360637/arbi-marketplace/rainforest-B00I6JGGP0-1766360636808.webp" -o "breville-espresso-210/image-1.webp"
echo "   ✅ 1 image downloaded"

# Canon EOS R50 - $203.70 profit
mkdir -p "canon-eos-r50-204"
echo "5. Canon EOS R50 ($203.70 profit)"
curl -sL "https://res.cloudinary.com/dyfumzftc/image/upload/v1766360594/arbi-marketplace/rainforest-B0CHX7QBZP-1766360593960.webp" -o "canon-eos-r50-204/image-1.webp"
echo "   ✅ 1 image downloaded"

# iRobot Roomba j7+ - $179.70 profit
mkdir -p "roomba-j7-180"
echo "6. iRobot Roomba j7+ ($179.70 profit)"
curl -sL "https://res.cloudinary.com/dyfumzftc/image/upload/v1766360608/arbi-marketplace/rainforest-B09V3HYQF5-1766360607779.webp" -o "roomba-j7-180/image-1.webp"
echo "   ✅ 1 image downloaded"

# Meta Quest 3 - $174.65 profit
mkdir -p "meta-quest-3-175"
echo "7. Meta Quest 3 ($174.65 profit)"
curl -sL "https://res.cloudinary.com/dyfumzftc/image/upload/v1766360521/arbi-marketplace/rainforest-B0C8VKH1ZH-1766360520365.webp" -o "meta-quest-3-175/image-1.webp"
echo "   ✅ 1 image downloaded"

# Nintendo Switch OLED - $145.00 profit
mkdir -p "nintendo-switch-145"
echo "8. Nintendo Switch OLED ($145.00 profit)"
curl -sL "https://res.cloudinary.com/dyfumzftc/image/upload/v1766360536/arbi-marketplace/rainforest-B098RKWHHZ-1766360535699.webp" -o "nintendo-switch-145/image-1.webp"
echo "   ✅ 1 image downloaded"

# Apple iPad 10th Gen - $122.15 profit
mkdir -p "ipad-10th-122"
echo "9. Apple iPad 10th Gen ($122.15 profit)"
curl -sL "https://res.cloudinary.com/dyfumzftc/image/upload/v1766360522/arbi-marketplace/rainforest-B0BSHF7WHW-1766360521927.jpg" -o "ipad-10th-122/image-1.jpg"
echo "   ✅ 1 image downloaded"

# MacBook Air M2 (alternative listing) - $119.88 profit
mkdir -p "macbook-air-m2-alt-120"
echo "10. MacBook Air M2 - Alternative ($119.88 profit)"
curl -sL "https://res.cloudinary.com/dyfumzftc/image/upload/v1766517472/arbi-marketplace/opp_macbook_air_m2-1766517471467.webp" -o "macbook-air-m2-alt-120/image-1.webp"
curl -sL "https://res.cloudinary.com/dyfumzftc/image/upload/v1766517475/arbi-marketplace/opp_macbook_air_m2-1766517474540.webp" -o "macbook-air-m2-alt-120/image-2.webp"
echo "   ✅ 2 images downloaded"

# Ray-Ban Meta Smart Glasses - $104.65 profit
mkdir -p "rayban-meta-105"
echo "11. Ray-Ban Meta Smart Glasses ($104.65 profit)"
curl -sL "https://res.cloudinary.com/dyfumzftc/image/upload/v1766360679/arbi-marketplace/rainforest-B0CC2W7CT9-1766360678795.webp" -o "rayban-meta-105/image-1.webp"
echo "   ✅ 1 image downloaded"

# GoPro HERO12 - $104.70 profit
mkdir -p "gopro-hero12-105"
echo "12. GoPro HERO12 ($104.70 profit)"
curl -sL "https://res.cloudinary.com/dyfumzftc/image/upload/v1766360565/arbi-marketplace/rainforest-B0BKVLG37Y-1766360564584.webp" -o "gopro-hero12-105/image-1.webp"
echo "   ✅ 1 image downloaded"

# Apple AirPods Pro 2 - $99.50 profit
mkdir -p "airpods-pro-2-100"
echo "13. Apple AirPods Pro 2 ($99.50 profit)"
curl -sL "https://res.cloudinary.com/dyfumzftc/image/upload/v1766360538/arbi-marketplace/rainforest-B0D1XD1ZV3-1766360537835.jpg" -o "airpods-pro-2-100/image-1.jpg"
echo "   ✅ 1 image downloaded"

# Dyson V15 - $97.35 profit
mkdir -p "dyson-v15-97"
echo "14. Dyson V15 Vacuum ($97.35 profit)"
curl -sL "https://res.cloudinary.com/dyfumzftc/image/upload/v1766517406/arbi-marketplace/opp_dyson_v15-1766517405438.webp" -o "dyson-v15-97/image-1.webp"
curl -sL "https://res.cloudinary.com/dyfumzftc/image/upload/v1766517407/arbi-marketplace/opp_dyson_v15-1766517406851.webp" -o "dyson-v15-97/image-2.webp"
echo "   ✅ 2 images downloaded"

# GoPro HERO12 (alternative) - $87.25 profit
mkdir -p "gopro-hero12-alt-87"
echo "15. GoPro HERO12 - Alternative ($87.25 profit)"
curl -sL "https://res.cloudinary.com/dyfumzftc/image/upload/v1766517514/arbi-marketplace/opp_gopro_hero12-1766517513786.webp" -o "gopro-hero12-alt-87/image-1.webp"
curl -sL "https://res.cloudinary.com/dyfumzftc/image/upload/v1766517515/arbi-marketplace/opp_gopro_hero12-1766517515035.webp" -o "gopro-hero12-alt-87/image-2.webp"
echo "   ✅ 2 images downloaded"

# Meta Quest 3 (alternative) - $85.80 profit
mkdir -p "meta-quest-3-alt-86"
echo "16. Meta Quest 3 - Alternative ($85.80 profit)"
curl -sL "https://res.cloudinary.com/dyfumzftc/image/upload/v1766517388/arbi-marketplace/opp_meta_quest3-1766517387313.webp" -o "meta-quest-3-alt-86/image-1.webp"
echo "   ✅ 1 image downloaded"

# Nintendo Switch OLED (alternative) - $67.80 profit
mkdir -p "nintendo-switch-alt-68"
echo "17. Nintendo Switch OLED - Alternative ($67.80 profit)"
curl -sL "https://res.cloudinary.com/dyfumzftc/image/upload/v1766517495/arbi-marketplace/opp_nintendo_switch_oled-1766517494259.webp" -o "nintendo-switch-alt-68/image-1.webp"
curl -sL "https://res.cloudinary.com/dyfumzftc/image/upload/v1766517495/arbi-marketplace/opp_nintendo_switch_oled-1766517495739.webp" -o "nintendo-switch-alt-68/image-2.webp"
echo "   ✅ 2 images downloaded"

# Ninja CREAMi - $62.65 profit
mkdir -p "ninja-creami-63"
echo "18. Ninja CREAMi ($62.65 profit)"
curl -sL "https://res.cloudinary.com/dyfumzftc/image/upload/v1766360623/arbi-marketplace/rainforest-B0B7MTDCXL-1766360622244.webp" -o "ninja-creami-63/image-1.webp"
echo "   ✅ 1 image downloaded"

# Apple AirPods Pro (alternative) - $47.25 profit
mkdir -p "airpods-pro-alt-47"
echo "19. Apple AirPods Pro - Alternative ($47.25 profit)"
curl -sL "https://res.cloudinary.com/dyfumzftc/image/upload/v1766517344/arbi-marketplace/opp_airpods_pro-1766517343036.webp" -o "airpods-pro-alt-47/image-1.webp"
curl -sL "https://res.cloudinary.com/dyfumzftc/image/upload/v1766517345/arbi-marketplace/opp_airpods_pro-1766517344731.webp" -o "airpods-pro-alt-47/image-2.webp"
echo "   ✅ 2 images downloaded"

# Samsung Galaxy Buds 2 Pro - $27.00 profit
mkdir -p "samsung-buds-2-pro-27"
echo "20. Samsung Galaxy Buds 2 Pro ($27.00 profit)"
curl -sL "https://res.cloudinary.com/dyfumzftc/image/upload/v1766460496/arbi-marketplace/opp_samsung_buds-1766460496124.webp" -o "samsung-buds-2-pro-27/image-1.webp"
echo "   ✅ 1 image downloaded"

# Kindle Paperwhite - $25.20 profit
mkdir -p "kindle-paperwhite-25"
echo "21. Kindle Paperwhite ($25.20 profit)"
curl -sL "https://res.cloudinary.com/dyfumzftc/image/upload/v1766460567/arbi-marketplace/opp_kindle_pw-1766460567228.jpg" -o "kindle-paperwhite-25/image-1.jpg"
echo "   ✅ 1 image downloaded"

# JBL Flip 6 - $24.99 profit
mkdir -p "jbl-flip-6-25"
echo "22. JBL Flip 6 Speaker ($24.99 profit)"
curl -sL "https://res.cloudinary.com/dyfumzftc/image/upload/v1766460605/arbi-marketplace/opp_jbl_flip6-1766460605096.webp" -o "jbl-flip-6-25/image-1.webp"
echo "   ✅ 1 image downloaded"

# Logitech MX Master 3S - $20.00 profit
mkdir -p "logitech-mx-20"
echo "23. Logitech MX Master 3S ($20.00 profit)"
curl -sL "https://res.cloudinary.com/dyfumzftc/image/upload/v1766460562/arbi-marketplace/opp_logitech_mx-1766460561188.jpg" -o "logitech-mx-20/image-1.jpg"
echo "   ✅ 1 image downloaded"

# Logitech MX Master 3S (alternative) - $20.00 profit
mkdir -p "logitech-mx-alt-20"
echo "24. Logitech MX Master 3S - Alternative ($20.00 profit)"
curl -sL "https://res.cloudinary.com/dyfumzftc/image/upload/v1766460533/arbi-marketplace/opp_logitech_mx-1766460532270.gif" -o "logitech-mx-alt-20/image-1.gif"
echo "   ✅ 1 image downloaded"

# Anker PowerCore - $10.00 profit
mkdir -p "anker-powercore-10"
echo "25. Anker PowerCore 20000mAh ($10.00 profit)"
curl -sL "https://res.cloudinary.com/dyfumzftc/image/upload/v1766460513/arbi-marketplace/opp_anker_powercore-1766460513019.webp" -o "anker-powercore-10/image-1.webp"
echo "   ✅ 1 image downloaded"

echo ""
echo "════════════════════════════════════════════════════════"
echo "✅ Download Complete!"
echo "════════════════════════════════════════════════════════"
echo ""
echo "📁 Images saved to: product-images/"
echo "📊 Total products with images: 25"
echo "📸 Total images downloaded: 32"
echo ""
echo "💡 Top 5 products by profit:"
echo "   1. Sony Alpha A7 IV - $749.40"
echo "   2. MacBook Air M2 - $419.65"
echo "   3. Garmin Fenix 7X - $269.70"
echo "   4. Breville Espresso - $209.70"
echo "   5. Canon EOS R50 - $203.70"
echo ""
echo "🚀 Ready to create campaigns!"
echo ""
