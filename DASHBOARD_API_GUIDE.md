# Dashboard API Documentation
## For Revenue Monitoring & Product Management

**Base API URL**: `https://api.arbi.creai.dev`

---

## 🔐 Authentication

Currently **no authentication required** for MVP. Add API key authentication later:
```typescript
headers: {
  'Authorization': `Bearer ${API_KEY}`,
  'Content-Type': 'application/json'
}
```

---

## 📊 Marketplace API Endpoints

### 1. Get All Product Listings
**GET** `/api/marketplace/listings`

**Response:**
```typescript
{
  total: number;
  listings: Array<{
    listingId: string;              // "listing_1766279876757_mi2as3rm4"
    opportunityId: string;           // "rainforest-B09V3TGD7H"
    productTitle: string;            // "Apple MacBook Air 13-inch M2 Chip"
    productDescription: string;
    productImages: string[];         // Array of Cloudinary URLs
    supplierPrice: number;           // 1199
    supplierUrl: string;             // Amazon product URL
    supplierPlatform: string;        // "amazon"
    marketplacePrice: number;        // 1618.65
    estimatedProfit: number;         // 419.65
    status: 'active' | 'sold' | 'expired';
    listedAt: string;                // "2025-12-21T01:17:56.757Z"
    expiresAt: string;               // "2025-12-28T01:17:56.757Z"
  }>;
}
```

**Example:**
```javascript
const response = await fetch('https://api.arbi.creai.dev/api/marketplace/listings');
const data = await response.json();
console.log(`Total products: ${data.total}`);
```

---

### 2. Create New Listing
**POST** `/api/marketplace/list`

**Request Body:**
```typescript
{
  opportunityId: string;          // Required: Unique ID for this opportunity
  productTitle: string;           // Required: Product name
  productDescription?: string;     // Optional: Description
  productImageUrls?: string[];     // Optional: Array of image URLs (scraper will auto-find if empty)
  supplierPrice: number;          // Required: Cost from supplier
  supplierUrl: string;            // Required: Where to buy from
  supplierPlatform: string;       // Required: "amazon" | "ebay" | etc
  markupPercentage?: number;      // Optional: Default 35%
}
```

**Response:**
```typescript
{
  success: boolean;
  listing: MarketplaceListing;    // Full listing object
  message: string;
  adInfo?: {
    campaigns: Array<{
      campaignId: string;
      platform: 'google' | 'facebook';
      status: 'active';
    }>;
    totalCampaigns: number;
  };
  marketingInfo: {
    publicUrl: string;              // "https://www.arbi.creai.dev/product/listing_xxx"
    imageUrls: string[];            // Cloudinary CDN URLs
    shareableLinks: {
      facebook: string;
      twitter: string;
      pinterest: string | null;
    };
  };
}
```

**Example:**
```javascript
const newListing = await fetch('https://api.arbi.creai.dev/api/marketplace/list', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    opportunityId: 'custom-' + Date.now(),
    productTitle: 'Sony WH-1000XM5 Headphones',
    productDescription: 'Premium noise cancelling headphones',
    supplierPrice: 299.99,
    supplierUrl: 'https://amazon.com/dp/B09XS7JWHH',
    supplierPlatform: 'amazon',
    markupPercentage: 35  // 35% profit margin
  })
});

const result = await newListing.json();
console.log(`Product listed: ${result.marketingInfo.publicUrl}`);
```

---

### 3. Get Buyer Orders
**GET** `/api/marketplace/orders`

**Response:**
```typescript
{
  total: number;
  orders: Array<{
    orderId: string;
    listingId: string;
    buyerEmail: string;
    amount: number;
    status: 'pending' | 'paid' | 'fulfilled' | 'cancelled';
    stripeSessionId: string;
    createdAt: string;
  }>;
}
```

**Example:**
```javascript
const orders = await fetch('https://api.arbi.creai.dev/api/marketplace/orders');
const data = await orders.json();
console.log(`Total orders: ${data.total}`);
```

---

### 4. Get Analytics (Revenue Dashboard)
**GET** `/api/marketplace/analytics`

**Response:**
```typescript
{
  totalRevenue: number;      // Total money received
  totalOrders: number;       // Number of orders
  totalProfit: number;       // Revenue - supplier costs
  activeListings: number;    // Products currently live
}
```

**Example:**
```javascript
const analytics = await fetch('https://api.arbi.creai.dev/api/marketplace/analytics');
const stats = await analytics.json();

console.log(`Revenue: $${stats.totalRevenue}`);
console.log(`Profit: $${stats.totalProfit}`);
console.log(`Orders: ${stats.totalOrders}`);
console.log(`Active Products: ${stats.activeListings}`);
```

---

## 🤖 Autonomous Arbitrage API

### 5. Get System Status
**GET** `/api/autonomous/status`

**Response:**
```typescript
{
  status: 'running' | 'stopped';
  config: {
    minScore: number;
    minROI: number;
    minProfit: number;
    maxPrice: number;
    autoBuyEnabled: boolean;
  };
  stats: {
    totalScans: number;
    totalOpportunities: number;
    avgScore: number;
  };
  uptime: number;  // milliseconds
}
```

---

### 6. Start Autonomous Scanner
**POST** `/api/autonomous/start`

**Request Body:**
```typescript
{
  config?: {
    minScore?: number;        // Default: 80
    minROI?: number;          // Default: 30 (30%)
    minProfit?: number;       // Default: 10
    maxPrice?: number;        // Default: 500
    autoBuyEnabled?: boolean; // Default: false
  };
}
```

**Response:**
```typescript
{
  success: boolean;
  message: string;
  initialOpportunities: number;
  config: AutonomousConfig;
}
```

---

### 7. Stop Autonomous Scanner
**POST** `/api/autonomous/stop`

**Response:**
```typescript
{
  success: boolean;
  message: string;
  finalStats: {
    totalScans: number;
    totalOpportunities: number;
  };
}
```

---

### 8. Get Opportunities
**GET** `/api/autonomous/opportunities?minScore=80&status=active&limit=50`

**Query Params:**
- `minScore`: Filter by minimum score (0-100)
- `status`: Filter by status
- `limit`: Max results to return

**Response:**
```typescript
{
  total: number;
  opportunities: Array<{
    id: string;
    product: {
      id: string;
      title: string;
      price: number;
      imageUrl: string;
      url: string;
    };
    profit: {
      sourcePrice: number;
      targetPrice: number;
      netProfit: number;
      profitMargin: number;
      roi: number;
    };
    score: {
      score: number;
      tier: 'excellent' | 'high' | 'medium' | 'low';
      confidence: number;
      reasoning: string[];
    };
    foundAt: string;
    expiresAt: string;
    status: string;
  }>;
}
```

---

### 9. Trigger Manual Scan
**POST** `/api/autonomous/scan-now`

**Response:**
```typescript
{
  success: boolean;
  message: string;
  opportunitiesFound: number;
  opportunities: Opportunity[];
}
```

---

## 🎨 Frontend Integration Example

### React Dashboard Component

```typescript
// hooks/useMarketplace.ts
import { useState, useEffect } from 'react';

const API_URL = 'https://api.arbi.creai.dev';

export function useMarketplace() {
  const [listings, setListings] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch listings
        const listingsRes = await fetch(`${API_URL}/api/marketplace/listings`);
        const listingsData = await listingsRes.json();
        setListings(listingsData.listings);

        // Fetch analytics
        const analyticsRes = await fetch(`${API_URL}/api/marketplace/analytics`);
        const analyticsData = await analyticsRes.json();
        setAnalytics(analyticsData);
      } catch (error) {
        console.error('Failed to fetch marketplace data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();

    // Refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  return { listings, analytics, loading };
}
```

### Revenue Dashboard Component

```typescript
// components/RevenueDashboard.tsx
import { useMarketplace } from '../hooks/useMarketplace';

export function RevenueDashboard() {
  const { listings, analytics, loading } = useMarketplace();

  if (loading) return <div>Loading...</div>;

  return (
    <div className="dashboard">
      <h1>Dropshipping Dashboard</h1>

      {/* Revenue Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <h3>Total Revenue</h3>
          <p className="big-number">${analytics?.totalRevenue?.toFixed(2) || '0.00'}</p>
        </div>

        <div className="stat-card">
          <h3>Total Profit</h3>
          <p className="big-number">${analytics?.totalProfit?.toFixed(2) || '0.00'}</p>
        </div>

        <div className="stat-card">
          <h3>Orders</h3>
          <p className="big-number">{analytics?.totalOrders || 0}</p>
        </div>

        <div className="stat-card">
          <h3>Active Products</h3>
          <p className="big-number">{analytics?.activeListings || 0}</p>
        </div>
      </div>

      {/* Product Listings */}
      <div className="listings">
        <h2>Your Products</h2>
        {listings.map(listing => (
          <div key={listing.listingId} className="listing-card">
            <img src={listing.productImages[0]} alt={listing.productTitle} />
            <div className="listing-info">
              <h3>{listing.productTitle}</h3>
              <p>Price: ${listing.marketplacePrice}</p>
              <p>Profit: ${listing.estimatedProfit}</p>
              <a href={`https://www.arbi.creai.dev/product/${listing.listingId}`} target="_blank">
                View Product Page →
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## 📱 Quick Setup for Your Frontend Repo

1. **Create API client file** (`lib/api.ts`):

```typescript
const API_URL = 'https://api.arbi.creai.dev';

export const marketplaceApi = {
  async getListings() {
    const res = await fetch(`${API_URL}/api/marketplace/listings`);
    return res.json();
  },

  async getAnalytics() {
    const res = await fetch(`${API_URL}/api/marketplace/analytics`);
    return res.json();
  },

  async getOrders() {
    const res = await fetch(`${API_URL}/api/marketplace/orders`);
    return res.json();
  },

  async createListing(data) {
    const res = await fetch(`${API_URL}/api/marketplace/list`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  }
};
```

2. **Add to your environment** (`.env.local`):
```bash
NEXT_PUBLIC_API_URL=https://api.arbi.creai.dev
```

3. **Use in your components**:
```typescript
import { marketplaceApi } from '@/lib/api';

export default function Dashboard() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    marketplaceApi.getAnalytics().then(setStats);
  }, []);

  return (
    <div>
      <h1>Revenue: ${stats?.totalRevenue || 0}</h1>
    </div>
  );
}
```

---

## 🚀 Real-Time Updates

For live dashboard updates, you can poll every 10-30 seconds:

```typescript
useEffect(() => {
  const fetchData = async () => {
    const analytics = await marketplaceApi.getAnalytics();
    setStats(analytics);
  };

  fetchData();
  const interval = setInterval(fetchData, 10000); // Every 10s
  return () => clearInterval(interval);
}, []);
```

---

## 🎯 Key Metrics to Display

### Revenue Dashboard Must-Haves:
1. **Total Revenue** - How much money came in
2. **Total Profit** - Revenue - supplier costs
3. **Total Orders** - Number of purchases
4. **Active Listings** - Products currently for sale
5. **Conversion Rate** - Orders / Listings
6. **Average Order Value** - Revenue / Orders

### Product Management:
1. List of all products with images
2. Edit/delete products
3. Quick links to product pages
4. Status indicators (active/sold/expired)

### Order Management:
1. Recent orders
2. Order status (pending/paid/fulfilled)
3. Customer email
4. Fulfillment actions

---

## 🔒 CORS Already Configured

Your API already allows requests from:
- `https://www.arbi.creai.dev`
- `https://dashboard.arbi.creai.dev`
- `http://localhost:3000`
- `http://localhost:5173`

So you can call the API directly from your frontend without issues!

---

## 📊 Dashboard URL Structure

**Recommended URLs:**
```
dashboard.arbi.creai.dev/              # Overview/Analytics
dashboard.arbi.creai.dev/products      # Product listings
dashboard.arbi.creai.dev/orders        # Order management
dashboard.arbi.creai.dev/opportunities # Arbitrage opportunities
dashboard.arbi.creai.dev/settings      # Configuration
```

---

## ✅ Next Steps

1. Copy `lib/api.ts` to your frontend repo
2. Create dashboard pages using the API routes above
3. Deploy to dashboard.arbi.creai.dev
4. Monitor revenue in real-time!

**All API routes are live and working NOW** - you can start building immediately!
