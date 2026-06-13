#!/usr/bin/env bash
#
# make-first-sale.sh — create a tiny demo listing and print its checkout links,
# so you can push a real (or Stripe-test) payment through the full pipeline and
# prove the app makes money end to end:
#
#   list -> product page -> Stripe checkout -> webhook -> order saved -> revenue++
#
# PREREQUISITES (set on the backend / Railway, not here):
#   - STRIPE_SECRET_KEY   sk_test_... to prove with NO real money (card 4242 4242 4242 4242),
#                         or sk_live_... for a real charge.
#   - STRIPE_WEBHOOK_SECRET + a Stripe webhook pointing at
#       <BASE_URL>/api/webhooks/stripe   (needed for the order/revenue half).
#
# USAGE:
#   BASE_URL=https://api.arbi.creai.dev ./make-first-sale.sh
#   # local:  BASE_URL=http://127.0.0.1:3000 ./make-first-sale.sh
#
# ENV OVERRIDES:
#   SUPPLIER_PRICE (default 0.50)  MARKUP (default 100 => marketplace price = $1.00)

set -euo pipefail

BASE_URL="${BASE_URL:-https://api.arbi.creai.dev}"
SUPPLIER_PRICE="${SUPPLIER_PRICE:-0.50}"
MARKUP="${MARKUP:-100}"

echo "→ Creating demo listing on ${BASE_URL} (supplierPrice=${SUPPLIER_PRICE}, markup=${MARKUP}%)..."

resp="$(curl -sS -X POST "${BASE_URL}/api/marketplace/list" \
  -H 'content-type: application/json' \
  -d "{
    \"opportunityId\": \"demo_$(date +%s)\",
    \"productTitle\": \"ARBI Proof Listing\",
    \"productDescription\": \"End-to-end payment proof listing. Safe to archive after testing.\",
    \"supplierPrice\": ${SUPPLIER_PRICE},
    \"supplierUrl\": \"https://example.com/demo-product\",
    \"supplierPlatform\": \"other\",
    \"markupPercentage\": ${MARKUP},
    \"productImageUrls\": [\"https://res.cloudinary.com/demo/image/upload/sample.jpg\"]
  }")"

echo "$resp"

listing_id="$(printf '%s' "$resp" | grep -oE '"listingId":"[^"]+"' | head -1 | cut -d'"' -f4 || true)"

if [ -z "${listing_id}" ]; then
  echo
  echo "✗ Could not create a listing. Most likely the backend has no STRIPE_SECRET_KEY"
  echo "  yet, or validation failed. Check the response above."
  exit 1
fi

echo
echo "=================================================================="
echo " Listing ID:   ${listing_id}"
echo " Product page: ${BASE_URL}/product/${listing_id}"
echo " 1-CLICK BUY:  ${BASE_URL}/checkout/${listing_id}"
echo "               ^ open this in a browser; it redirects straight to Stripe Checkout."
echo "=================================================================="
echo
echo "Then verify the money flowed:"
echo "  • Stripe Dashboard → Payments (the charge)"
echo "  • ${BASE_URL}/api/marketplace/orders          (order recorded by the webhook)"
echo "  • ${BASE_URL}/api/revenue/status              (currentRevenue incremented)"
echo "  • CommandCenter dashboard → revenue + activity feed update"
