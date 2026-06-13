# 🔥 URGENT: Fix Checkout (2 minutes)

## Problem
Your checkout shows "⚠️ Checkout Error" because `STRIPE_SECRET_KEY` is missing.

## Solution (2 minutes)

### Step 1: Get Your Stripe Key

1. Go to https://dashboard.stripe.com/register (free signup)
2. After signup, click **Developers** → **API Keys**
3. Copy your **Secret key** (starts with `sk_test_` or `sk_live_`)

**For Testing (Recommended First):**
```
sk_test_51...  (use this for testing with fake cards)
```

**For Real Money (After Testing):**
```
sk_live_51...  (use this for real transactions)
```

### Step 2: Add to Railway

1. Go to **Railway Dashboard**
2. Click your **API service**
3. Click **Variables** tab
4. Click **+ New Variable**
5. Add:
   ```
   STRIPE_SECRET_KEY=sk_test_YOUR_KEY_HERE
   ```
6. Railway will auto-redeploy (takes ~1 minute)

### Step 3: Test It

After Railway redeploys, test a checkout URL:
```
https://arbi-production.up.railway.app/checkout/listing_1766146074994_0r8g0sobp
```

**Should redirect to Stripe checkout page** ✅

---

## Test Cards (for sk_test_ keys)

When testing with `sk_test_` key, use these fake cards:

**Success:**
```
Card: 4242 4242 4242 4242
Expiry: Any future date (e.g., 12/25)
CVC: Any 3 digits (e.g., 123)
ZIP: Any 5 digits (e.g., 12345)
```

**Decline:**
```
Card: 4000 0000 0000 0002
```

More test cards: https://stripe.com/docs/testing

---

## What Happens After Setup

1. **Checkout works** ✅
   - Customer clicks ad → Stripe checkout → Payment

2. **You get paid** 💰
   - Money goes to your Stripe account
   - Transfer to bank in 2-7 days

3. **Auto-fulfillment** 🚀
   - System detects payment via webhook
   - Auto-purchases from Amazon
   - Ships directly to customer
   - You keep the profit!

---

## Current Status

**5 Products Ready to Sell:**
- Nintendo Switch OLED - $145 profit
- AirPods Pro 2 - $99.50 profit
- **MacBook Air M2 - $419.65 profit** (best!)
- Meta Quest 3 - $174.65 profit
- iPad 10th Gen - $122.15 profit

**Just need Stripe key to start making money!** 🎯

---

## Estimated Time to First Sale

After Stripe setup:
- Google Ads approval: 1-2 hours
- First sale: 2-4 hours
- **You could make your first $100-$400 profit TODAY!**

---

## Questions?

**Q: Is Stripe free?**
A: Yes! No monthly fees. Only 2.9% + 30¢ per successful transaction.

**Q: When do I get paid?**
A: 2-7 days after customer payment (bank transfer from Stripe)

**Q: What about refunds?**
A: Stripe handles it automatically. Refund = profit reversal.

**Q: Can I use PayPal instead?**
A: Not currently - Stripe only. But Stripe accepts all major cards.

---

**🚀 Add your Stripe key to Railway NOW and let's make money!**
