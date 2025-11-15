# ARBI Dashboard - UI Implementation Plan

## Recommended Starter Template

**GitHub: next-shadcn-dashboard-starter**
- Repo: https://github.com/Kiranism/next-shadcn-dashboard-starter
- Stack: Next.js 15, shadcn/ui, Tailwind CSS, TypeScript
- Features: Auth, tables, charts, forms, dark mode

## Why This Template?

✅ **Modern Stack**: Next.js 15 App Router + Server Components
✅ **Beautiful UI**: shadcn/ui components (Radix UI primitives)
✅ **Ready Charts**: Recharts integration for analytics
✅ **Data Tables**: Tanstack Table with sorting, filtering, pagination
✅ **Type-Safe**: Full TypeScript support
✅ **Free & Open Source**: MIT license

## Integration Steps

### 1. Fork and Add to Monorepo
```bash
# Clone the template
git clone https://github.com/Kiranism/next-shadcn-dashboard-starter temp-dashboard

# Move to monorepo
mv temp-dashboard apps/dashboard
rm -rf apps/dashboard/.git

# Update package.json
cd apps/dashboard
```

### 2. Configure for ARBI
```json
{
  "name": "@arbi/dashboard",
  "version": "0.1.0",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  }
}
```

### 3. Connect to Railway Backend
```typescript
// apps/dashboard/lib/api.ts
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://your-app.railway.app';

export const autonomousApi = {
  getStatus: () => fetch(`${API_URL}/api/autonomous/status`).then(r => r.json()),
  getOpportunities: (filters) => fetch(`${API_URL}/api/autonomous/opportunities?${new URLSearchParams(filters)}`).then(r => r.json()),
  startSystem: (config) => fetch(`${API_URL}/api/autonomous/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ config })
  }).then(r => r.json()),
  // ... more endpoints
};
```

### 4. Key Dashboard Pages

#### `/dashboard` - Overview
- Total opportunities found (24h, 7d, 30d)
- Total potential profit
- System status (running/stopped)
- Charts: Profit over time, Score distribution

#### `/dashboard/opportunities` - Live Feed
- Real-time table of opportunities
- Filters: minScore, category, profit range
- Actions: View details, Mark purchased, Dismiss
- Auto-refresh every 30s

#### `/dashboard/analytics` - Deep Insights
- Profit by category
- ROI trends
- Success rate (opportunities → purchases → profits)
- Best performing sellers

#### `/dashboard/config` - System Control
- Start/stop autonomous system
- Adjust thresholds (minScore, minROI, maxPrice)
- Enable/disable auto-buy
- Set daily budget

#### `/dashboard/uhnw` - High-Value Opportunities
- Luxury items only (>$10K profit)
- Manual review required
- Authentication partner integration
- Wire transfer tracking

### 5. Deploy to Vercel
```bash
# From repo root
cd apps/dashboard
vercel
# Follow prompts, set NEXT_PUBLIC_API_URL to Railway URL
```

## Dashboard Components Needed

### Opportunity Card Component
```tsx
<OpportunityCard
  product={...}
  profit={netProfit: 245, roi: 35, margin: 22}
  score={score: 85, tier: 'high'}
  actions={['View eBay', 'Purchase', 'Dismiss']}
/>
```

### Profit Chart Component
```tsx
<ProfitChart
  data={dailyProfits}
  timeRange="7d"
  showProjection={true}
/>
```

### System Status Widget
```tsx
<SystemStatus
  isRunning={true}
  lastScan="2 minutes ago"
  opportunitiesFound={47}
  uptime="3d 12h"
/>
```

## Real-Time Updates

Use Vercel's edge functions for SSE (Server-Sent Events):
```typescript
// app/api/stream/opportunities/route.ts
export async function GET(request: Request) {
  const stream = new ReadableStream({
    async start(controller) {
      // Poll Railway API every 10s, push updates
    }
  });
  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream' }
  });
}
```

## Mobile Responsive

shadcn/ui is mobile-first:
- Collapsible sidebar on mobile
- Touch-friendly opportunity cards
- Bottom navigation for quick actions
- Push notifications (via Vercel Web Push)

---

**Next Steps:**
1. Fork next-shadcn-dashboard-starter
2. Add to monorepo as apps/dashboard
3. Connect to Railway API
4. Deploy to Vercel
5. Configure domain (dashboard.arbi.app)
