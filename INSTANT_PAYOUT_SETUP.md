# 💸 Stripe Instant Payout Setup

**Get cash in bank IMMEDIATELY instead of waiting 2-7 days!**

---

## 🚀 The Flow

### With Instant Payout Enabled:

```
1. Customer pays $1,618.65 → Stripe balance

2. Instant payout triggered (30 min):
   - Stripe balance: $1,571.19 (after 2.9% + 30¢ fee)
   - Instant payout fee: -$15.71 (1%)
   - To bank account: $1,555.48 ✅

3. Robot waits 30-60 min → Cash arrives in bank

4. Amazon purchase with DEBIT CARD:
   - Uses cash that's now in your bank
   - Charges: $1,199.00
   - Remaining in bank: $356.48 profit ✅
```

### Profit Breakdown:
```
Customer payment:     $1,618.65
Stripe fee (2.9%):    -$47.46
Instant payout (1%):  -$15.71
Amazon cost:          -$1,199.00
------------------------
NET PROFIT:           $356.48 ✅
```

---

## ⚙️ Setup (5 minutes)

### Step 1: Enable Instant Payouts in Stripe

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Click **Settings** → **Business settings** → **Payouts**
3. Under "Instant payouts", click **Enable**
4. Connect your debit card or bank account
5. Done!

### Step 2: Add to Railway

Go to Railway → API Service → Variables:

```bash
# Enable instant payout automation
STRIPE_INSTANT_PAYOUT=true

# Amazon payment (use DEBIT card linked to bank)
AMAZON_CARD_NUMBER=4111111111111111  # Your DEBIT card
AMAZON_CARD_EXP_MONTH=12
AMAZON_CARD_EXP_YEAR=2027
AMAZON_CARD_CVV=123

# Billing address
AMAZON_BILLING_NAME=Your Name
AMAZON_BILLING_ADDRESS=123 Main St
AMAZON_BILLING_CITY=New York
AMAZON_BILLING_STATE=NY
AMAZON_BILLING_ZIP=10001
AMAZON_BILLING_PHONE=555-1234
```

### Step 3: Deploy & Test

```bash
# Railway will auto-deploy with new environment variables
# Test with DRY_RUN mode first:
DRY_RUN=true
```

---

## 💡 Why Instant Payouts?

### ✅ Pros:
- **Instant cash flow** - Money in bank in 30 min
- **No credit needed** - Use debit card instead
- **No debt** - Never owe credit card companies
- **Scales forever** - No credit limit issues

### ⚠️ Cons:
- **1% fee** - $15.71 per $1,571 payout
- **Slightly lower profit** - $356 vs $372 (4% less)
- **Bank fees** - Some banks charge for instant transfers

### 💰 When to Use:

**Use Instant Payouts if:**
- You don't have a credit card
- You want zero debt/risk
- You're doing 50+ sales/day (cash flow matters)
- You prefer guaranteed cash before buying

**Skip Instant Payouts if:**
- You have a good credit card
- Want maximum profit (no 1% fee)
- Doing < 20 sales/day
- Credit limit is high enough

---

## 📊 Profit Comparison

### MacBook Air M2 Sale:

**With Credit Card (Standard):**
```
Revenue:        $1,618.65
Stripe fee:     -$47.46
Amazon cost:    -$1,199.00
NET PROFIT:     $372.19 ✅ (23% margin)
```

**With Instant Payout:**
```
Revenue:        $1,618.65
Stripe fee:     -$47.46
Payout fee:     -$15.71
Amazon cost:    -$1,199.00
NET PROFIT:     $356.48 ✅ (22% margin)
```

**Difference:** -$15.71 per sale (-4.2%)

---

## 🎯 Recommended Strategy

### Start with Credit Card:
1. Use credit card for first 10 sales
2. Maximum profit per sale
3. Build up Stripe balance
4. Pay off credit card when Stripe pays out

### Scale with Instant Payouts:
5. Once doing 20+ sales/day
6. Enable instant payouts
7. Guaranteed cash flow
8. Never worry about credit limits

---

## 🔧 Technical Details

### How the Code Works:

```typescript
// apps/api/src/routes/stripe-webhook.ts

// When customer pays:
if (STRIPE_INSTANT_PAYOUT === 'true') {
  // Calculate payout amount
  const payoutAmount = customerPayment - stripeFee;

  // Trigger instant payout
  const payout = await stripe.payouts.create({
    amount: payoutAmount,
    method: 'instant',  // Arrives in ~30 min
    currency: 'usd'
  });

  // Wait for payout to complete
  await wait(30 * 60 * 1000); // 30 minutes

  // NOW buy from Amazon (cash is in bank!)
  await buyFromAmazon();
}
```

### Instant Payout Limits:

- **Per transaction:** $10,000 max
- **Per day:** $50,000 max
- **Fee:** 1% (max $10 per payout)
- **Time:** 30 minutes typically

---

## 🚨 Important Notes

1. **Debit Card Required**
   - Can't use credit card for instant payouts
   - Must be checking/savings account
   - Stripe verifies ownership

2. **Business Account Recommended**
   - Separate business checking account
   - Easier accounting
   - Professional tax reporting

3. **Monitor Balance**
   - Keep $5K+ buffer in business account
   - Set low balance alerts
   - Payouts arrive before Amazon charges

4. **Test First**
   - Use `DRY_RUN=true` initially
   - Verify payout arrives
   - Then enable real purchases

---

## 📈 Scaling Example

### Day 1-7: Credit Card ($0 invested)
```
Sales: 3/day × $372 profit = $1,116/day
Week profit: $7,812
Credit card balance: Pay off weekly
```

### Day 8+: Instant Payouts (Zero credit needed!)
```
Sales: 20/day × $356 profit = $7,120/day
Week profit: $49,840
Bank balance: Growing daily
```

---

## ✅ Quick Setup Checklist

- [ ] Enable instant payouts in Stripe Dashboard
- [ ] Add debit card to Stripe
- [ ] Add `STRIPE_INSTANT_PAYOUT=true` to Railway
- [ ] Add debit card details to Railway
- [ ] Test with `DRY_RUN=true`
- [ ] Remove `DRY_RUN` and go LIVE!

---

**💸 INSTANT CASH FLOW = INFINITE SCALING!**

**No credit card needed. No debt. Just pure profit in your bank account!** 🚀
