# ARBI API Endpoints for Frontend Integration

## Confirmed Working Endpoints (Railway)

### Health Check
```sh
curl https://arbi-production.up.railway.app/api/arbitrage/health
```

### List Opportunities
```sh
curl https://arbi-production.up.railway.app/api/arbitrage/opportunities
```

### Get User Settings
```sh
curl https://arbi-production.up.railway.app/api/arbitrage/settings
```

### Update User Settings
```sh
curl -X PUT https://arbi-production.up.railway.app/api/arbitrage/settings \
  -H "Content-Type: application/json" \
  -d '{"userId":"demo-user","settings":{"dailyLimit":1000,"perOpportunityMax":400,"monthlyLimit":10000,"reserveFund":1000,"riskTolerance":"moderate","enabledStrategies":["ecommerce_arbitrage"]}}'
```

### Execute Opportunity
```sh
curl -X POST https://arbi-production.up.railway.app/api/arbitrage/execute \
  -H "Content-Type: application/json" \
  -d '{"opportunityId":"your-opportunity-id"}'
```

---
Use these literal commands to test and integrate your frontend with the ARBI backend on Railway.
