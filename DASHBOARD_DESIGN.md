# 🎨 ARBI DASHBOARD - Complete Design Spec

## 🎯 Theme & Style (Based on www.arbi.creai.dev)

**Colors:**
- Primary: `#00f0ff` (Cyan/Blue glow)
- Secondary: `#7000ff` (Purple)  
- Background: `#050505` (Near black)
- Text: `#e2e8f0` (Light gray)

**Fonts:**
- Headings: `Syne` (Bold, modern)
- Body: `Exo 2` (Readable, tech-y)

**Design Style:**
- Cyber/futuristic aesthetic
- Clip-path borders (cyber-clip)
- Glowing text effects
- Noise overlay
- GSAP animations
- Dark mode only

---

## 🏗️ DASHBOARD ARCHITECTURE

### Separate Frontend Repo: `/dashboard`
```
dashboard/
├── src/
│   ├── app/
│   │   ├── auth/          # Authentication module
│   │   ├── dashboard/     # Main dashboard
│   │   ├── marketplace/   # Marketplace controls
│   │   ├── campaigns/     # Ad campaign management
│   │   ├── analytics/     # Revenue tracking
│   │   └── settings/      # Account settings
│   ├── components/        # Shared components
│   ├── services/          # API services
│   └── guards/            # Route guards
└── angular.json
```

---

## 📊 DASHBOARD PAGES & FEATURES

### 1. 🔐 AUTH FLOW

#### `/auth/login`
```
┌─────────────────────────────────────┐
│                                     │
│           🤖 ARBI                   │
│     Autonomous Arbitrage            │
│                                     │
│   ┌─────────────────────────────┐  │
│   │  Email                      │  │
│   │  ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒       │  │
│   └─────────────────────────────┘  │
│                                     │
│   ┌─────────────────────────────┐  │
│   │  Password                   │  │
│   │  ●●●●●●●●●●●●                │  │
│   └─────────────────────────────┘  │
│                                     │
│   [ LOGIN WITH GOOGLE ]             │
│   [ LOGIN WITH GITHUB ]             │
│                                     │
│   [  LOGIN  ] (Cyan glow button)    │
│                                     │
│   Don't have account? Sign up       │
│                                     │
└─────────────────────────────────────┘
```

**Endpoints:**
- `POST /api/auth/login`
- `POST /api/auth/register`
- `POST /api/auth/google`
- `POST /api/auth/github`
- `GET /api/auth/me`

#### `/auth/register`
- Email/Password
- OAuth (Google, GitHub)
- Tier selection (during signup)

---

### 2. 🏠 MAIN DASHBOARD (`/dashboard`)

```
┌────────────────────────────────────────────────────────────┐
│ ARBI          [Marketplace] [Campaigns] [Analytics] [👤]  │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  Welcome back, User! 👋                                     │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │  💰 Revenue  │  │  📦 Products │  │  📢 Campaigns│    │
│  │   $12,450    │  │      24      │  │      8       │    │
│  │   +23% ↑     │  │  Active      │  │  Running     │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ 🤖 AUTONOMOUS MARKETPLACE                           │  │
│  │                                                      │  │
│  │ Status: ⏸️ Stopped                                   │  │
│  │                                                      │  │
│  │ [  🚀 START AUTONOMOUS MODE  ] (Big cyan button)    │  │
│  │                                                      │  │
│  │ Last run: 2 hours ago                               │  │
│  │ Products found: 12 | Campaigns: 4 | Profit: $3,200  │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  Recent Activity                                            │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ ✅ Sale: MacBook Air M2 - $1,618.65                 │  │
│  │ 📢 Campaign launched: Sony A7 IV                    │  │
│  │ 📦 Product listed: Garmin Fenix 7X                  │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

**Key Features:**
- Real-time stats cards
- **BIG "START AUTONOMOUS MODE" button**
- Recent activity feed
- Quick actions

**Endpoints:**
- `GET /api/revenue/stats`
- `GET /api/marketplace/listings?status=active`
- `GET /api/campaigns/status`
- `POST /api/autonomous-marketplace/start` ⭐

---

### 3. 🛍️ MARKETPLACE PAGE (`/marketplace`)

```
┌────────────────────────────────────────────────────────────┐
│  Marketplace                              [+ Add Product]   │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  Filters: [All] [Active] [Sold] [Expired]                  │
│           Search: ▒▒▒▒▒▒▒▒▒▒▒▒                              │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ 📷 Sony A7 IV Camera                    $3,247.40    │ │
│  │ Profit: $749.40 | Status: 🟢 Active                  │ │
│  │ Listed: 2 days ago | Views: 234 | Sales: 0          │ │
│  │ [View Page] [Edit] [Create Ads] [Deactivate]        │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ 💻 MacBook Air M2                       $1,618.65    │ │
│  │ Profit: $419.65 | Status: 🟢 Active                  │ │
│  │ Listed: 3 days ago | Views: 456 | Sales: 2          │ │
│  │ [View Page] [Edit] [Create Ads] [Deactivate]        │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

**Features:**
- List all products
- Search/filter
- Quick stats per product
- **"Create Ads" button** for each product
- Bulk actions

**Endpoints:**
- `GET /api/marketplace/listings`
- `POST /api/marketplace/list`
- `PUT /api/marketplace/listings/:id`
- `DELETE /api/marketplace/listings/:id`
- `POST /api/campaigns/launch/:listingId` ⭐

---

### 4. 📢 CAMPAIGNS PAGE (`/campaigns`)

```
┌────────────────────────────────────────────────────────────┐
│  Ad Campaigns                    [🚀 Launch New Campaign]   │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  [  Launch Campaigns for Top 4 Products  ] (Featured)      │
│                                                             │
│  Active Campaigns (4)                                       │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ 📷 Sony A7 IV - Google Ads                           │ │
│  │ Status: 🟢 Active | Budget: $50/day                  │ │
│  │ Impressions: 12,450 | Clicks: 234 | Conv: 3         │ │
│  │ Spend: $147.50 | Revenue: $9,742 | ROI: 6,500%      │ │
│  │ [View in Google Ads] [Pause] [Edit Budget]          │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ 💻 MacBook Air M2 - Google Ads                       │ │
│  │ Status: 🟢 Active | Budget: $50/day                  │ │
│  │ Impressions: 8,230 | Clicks: 156 | Conv: 2          │ │
│  │ Spend: $98.20 | Revenue: $3,237 | ROI: 3,200%       │ │
│  │ [View in Google Ads] [Pause] [Edit Budget]          │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

**Features:**
- Campaign overview
- **Auto-launch top 4 button**
- Individual campaign controls
- Performance metrics
- Budget management

**Endpoints:**
- `GET /api/campaigns/list`
- `POST /api/campaigns/launch` (auto top 4) ⭐
- `POST /api/campaigns/launch/:listingId` (specific)
- `PUT /api/campaigns/:id/pause`
- `PUT /api/campaigns/:id/budget`

---

### 5. 📊 ANALYTICS PAGE (`/analytics`)

```
┌────────────────────────────────────────────────────────────┐
│  Analytics                    [Last 7 days ▼]               │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  Revenue Overview                                           │
│  ┌──────────────────────────────────────────────────────┐ │
│  │         $15,000                                       │ │
│  │                                                       │ │
│  │     ╱╲                                                │ │
│  │    ╱  ╲    ╱╲                                         │ │
│  │   ╱    ╲  ╱  ╲                                        │ │
│  │  ╱      ╲╱    ╲                                       │ │
│  │ ────────────────────────────────                      │ │
│  │ Mon  Tue  Wed  Thu  Fri  Sat  Sun                    │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                             │
│  Top Products by Revenue                                    │
│  1. MacBook Air M2         $9,742  (6 sales)               │
│  2. Sony A7 IV             $6,495  (2 sales)               │
│  3. Garmin Fenix 7X        $2,337  (2 sales)               │
│                                                             │
│  Campaign Performance                                       │
│  Total Spend: $523.40 | Total Revenue: $18,574             │
│  Overall ROI: 3,450%                                        │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

**Features:**
- Revenue charts
- Product performance
- Campaign ROI
- Profit tracking

**Endpoints:**
- `GET /api/revenue/stats`
- `GET /api/revenue/chart?period=7d`
- `GET /api/analytics/products`
- `GET /api/analytics/campaigns`

---

## 🎚️ TIER-BASED PERMISSIONS

### Free Tier
- ✅ View marketplace (max 5 products)
- ✅ Manual product listing
- ❌ Ad campaigns
- ❌ Autonomous mode
- ❌ Analytics

### Pro Tier ($49/mo)
- ✅ Up to 50 products
- ✅ Manual ad campaign creation
- ✅ Basic analytics
- ❌ Autonomous mode

### Enterprise Tier ($199/mo)
- ✅ Unlimited products
- ✅ Full ad campaign control
- ✅ **Autonomous marketplace** ⭐
- ✅ Advanced analytics
- ✅ API access
- ✅ Priority support

### Implementation:
```typescript
// Route guard
if (feature === 'autonomous' && user.tier !== 'enterprise') {
  showUpgradeModal();
  return false;
}
```

---

## 🔑 KEY COMPONENTS TO BUILD

### 1. Autonomous Control Panel
```typescript
<autonomous-control>
  <div class="cyber-clip bg-gradient-to-r from-cyan-900/20 to-purple-900/20">
    <h2>🤖 Autonomous Marketplace</h2>
    
    <button 
      *ngIf="status === 'stopped'"
      (click)="startAutonomous()"
      class="text-glow cyber-clip-sm">
      🚀 START AUTONOMOUS MODE
    </button>

    <div *ngIf="session$ | async as session">
      <p>Status: {{ session.status }}</p>
      <p>Phase: {{ session.progress.phase }}</p>
      <progress [value]="session.progress.percent"></progress>
    </div>
  </div>
</autonomous-control>
```

### 2. Campaign Launcher
```typescript
<campaign-launcher [product]="product">
  <button (click)="launchCampaign()">
    📢 Create Ads
  </button>
</campaign-launcher>
```

### 3. Product Card
```typescript
<product-card [product]="product">
  <div class="cyber-clip">
    <img [src]="product.image">
    <h3>{{ product.title }}</h3>
    <p>Profit: ${{ product.profit }}</p>
    <button (click)="createAds()">Create Ads</button>
  </div>
</product-card>
```

---

## 🚀 PRIORITY BUILD ORDER

1. **Auth Flow** (2-3 days)
   - Login/Register
   - OAuth
   - JWT handling

2. **Main Dashboard** (2 days)
   - Stats cards
   - **Autonomous START button**
   - Activity feed

3. **Marketplace Page** (2-3 days)
   - Product list
   - **Create Ads button per product**
   - Search/filter

4. **Campaigns Page** (2 days)
   - Campaign list
   - **Auto-launch top 4 button**
   - Performance metrics

5. **Analytics** (2 days)
   - Revenue charts
   - Product analytics

6. **Tier System** (1 day)
   - Permission guards
   - Upgrade modals

---

## 🎨 DESIGN TOKENS

```typescript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: '#00f0ff',
        secondary: '#7000ff',
        dark: '#050505',
      },
      fontFamily: {
        syne: ['Syne', 'sans-serif'],
        exo: ['Exo 2', 'sans-serif'],
      },
    },
  },
}
```

---

## 📡 API SERVICE EXAMPLE

```typescript
// services/autonomous.service.ts
@Injectable()
export class AutonomousService {
  private api = inject(HttpClient);
  
  start(config: AutonomousConfig) {
    return this.api.post('/api/autonomous-marketplace/start', config);
  }

  getStatus(sessionId: string) {
    return this.api.get(`/api/autonomous-marketplace/status/${sessionId}`);
  }

  stop(sessionId: string) {
    return this.api.post(`/api/autonomous-marketplace/stop/${sessionId}`);
  }
}
```

---

## 🎯 NEXT STEPS

1. **Create new repo**: `arbi-dashboard`
2. **Setup Angular** with Tailwind CSS
3. **Build auth flow** first
4. **Focus on 2 key features**:
   - 🚀 **Autonomous START button**
   - 📢 **Create Ads buttons**
5. Add analytics later

Want me to scaffold the Angular dashboard repo now?
