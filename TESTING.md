# ARBI Platform - Testing Guide

## 📋 Test Suite Overview

This repository includes comprehensive end-to-end automated tests to verify:
- ✅ Build & compilation
- ✅ API health & database connectivity
- ✅ CORS configuration
- ✅ Environment variables
- ✅ Core API endpoints
- ✅ Third-party integrations (Stripe, Cloudinary)

---

## 🚀 Quick Start

### 1. **Quick Health Check** (30 seconds)
```bash
./quick-test.sh
```

### 2. **Full Test Suite** (2-3 minutes)
```bash
# Install dependencies first
pnpm install

# Run all tests
npx tsx test-e2e.ts
```

### 3. **Production Test** (against deployed API)
```bash
API_URL=https://your-api.railway.app npx tsx test-e2e.ts
```

---

## 📊 Test Results Explained

### Test Status Indicators
- ✓ **PASS** - Test succeeded
- ✗ **FAIL** - Test failed (needs fixing)
- ⚠ **WARN** - Test passed with warnings
- ○ **SKIP** - Test skipped (dependencies not met)

### Common Test Failures

#### 1. **"connect ECONNREFUSED"**
**Cause:** API server is not running  
**Fix:**
```bash
# Start the API server
pnpm --filter @arbi/api start
```

#### 2. **"turbo: not found" / "tsup: not found"**
**Cause:** Dependencies not installed  
**Fix:**
```bash
pnpm install
```

#### 3. **"DATABASE_URL not set"**
**Cause:** Environment variables missing  
**Fix:**
```bash
# Copy example env file
cp .env.example .env

# Add your values to .env
```

#### 4. **"Database connection failed"**
**Cause:** Database not accessible  
**Fix:**
- Check DATABASE_URL is correct
- Ensure PostgreSQL is running
- Verify network connectivity

---

## 🔧 Test Categories

### **1. Build & Compilation Tests**

Tests that all packages build correctly.

```bash
# Run build tests only
pnpm build
```

**What's tested:**
- Workspace package builds
- TypeScript compilation
- Backend (API) build
- Frontend (Dashboard) build

**Expected result:** All packages build without errors

---

### **2. Infrastructure Tests**

Tests core platform infrastructure.

```bash
# Check API health
curl http://localhost:3000/health

# Should return:
# {
#   "status": "ok",
#   "database": "connected",
#   "timestamp": "2026-06-05T...",
#   "environment": "production"
# }
```

**What's tested:**
- API server health
- Database connectivity
- Environment variable configuration
- CORS security settings

---

### **3. API Endpoint Tests**

Tests all critical API endpoints.

**Endpoints tested:**
- `GET /health` - Health check
- `GET /api/marketplace/listings` - Product listings
- `GET /api/arbitrage/health` - Arbitrage engine status

**How to test manually:**
```bash
# Test health endpoint
curl http://localhost:3000/health

# Test marketplace API
curl http://localhost:3000/api/marketplace/listings

# Test arbitrage API
curl http://localhost:3000/api/arbitrage/health
```

---

### **4. Integration Tests**

Tests third-party service integrations.

**Services tested:**
- Stripe (payment processing)
- Cloudinary (image storage)
- Supabase (auth - landing page)

**Note:** Full integration tests require API keys

---

## 🎯 Pre-Deployment Checklist

Before deploying to production, ensure:

### **Required Environment Variables**
```bash
✓ DATABASE_URL=postgresql://...
✓ STRIPE_SECRET_KEY=sk_...
✓ CLOUDINARY_CLOUD_NAME=...
✓ CLOUDINARY_API_KEY=...
✓ CLOUDINARY_API_SECRET=...
✓ API_URL=https://...
✓ ALLOWED_ORIGINS=https://...
```

### **Build Success**
```bash
✓ pnpm build                    # All packages build
✓ pnpm --filter @arbi/api build # API builds
✓ pnpm --filter @arbi/dashboard build # Dashboard builds
```

### **Health Checks**
```bash
✓ /health endpoint returns 200
✓ Database shows "connected"
✓ No TypeScript errors
```

### **Security**
```bash
✓ CORS configured with specific origins
✓ No hardcoded secrets in code
✓ Environment variables set in Railway/Vercel
```

---

## 📈 Continuous Testing

### **On Every Commit**
```bash
# Run before committing
pnpm build
npx tsx test-e2e.ts
```

### **Before Deployment**
```bash
# Test against production API
API_URL=https://your-api.railway.app npx tsx test-e2e.ts
```

### **After Deployment**
```bash
# Verify deployment
curl https://your-api.railway.app/health

# Expected: {"status":"ok","database":"connected",...}
```

---

## 🐛 Debugging Failed Tests

### Enable Debug Logging
```bash
DEBUG=true npx tsx test-e2e.ts
```

### Test Specific Components

**Test API only:**
```bash
curl -v http://localhost:3000/health
```

**Test database only:**
```bash
psql $DATABASE_URL -c "SELECT 1"
```

**Test CORS:**
```bash
curl -H "Origin: http://localhost:5173" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     http://localhost:3000/health
```

---

## 📝 Writing New Tests

Add tests to `test-e2e.ts`:

```typescript
async function testNewFeature(): Promise<TestResult> {
  try {
    const response = await fetchWithTimeout(`${API_URL}/api/new-endpoint`);
    
    if (response.status === 200) {
      return {
        name: 'New Feature Test',
        status: 'PASS',
        message: 'Feature works correctly'
      };
    } else {
      return {
        name: 'New Feature Test',
        status: 'FAIL',
        message: `Unexpected status: ${response.status}`
      };
    }
  } catch (error: any) {
    return {
      name: 'New Feature Test',
      status: 'FAIL',
      message: error.message
    };
  }
}

// Add to runAllTests():
await runTest('New Feature', testNewFeature);
```

---

## 🔍 Test Coverage

Current test coverage:

| Component | Tests | Coverage |
|-----------|-------|----------|
| API Health | 3 | ✅ 100% |
| Database | 2 | ✅ 100% |
| CORS | 1 | ✅ 100% |
| Environment | 1 | ✅ 100% |
| Marketplace API | 1 | ⚠️ 50% |
| Integrations | 3 | ⚠️ 30% |
| **Total** | **11** | **75%** |

---

## 🎓 Best Practices

1. **Run tests before every commit**
2. **Test locally before deploying**
3. **Monitor production health endpoint**
4. **Keep tests fast (<2 minutes total)**
5. **Add tests for new features**
6. **Fix failing tests immediately**

---

## 🆘 Getting Help

If tests are failing and you can't figure out why:

1. Check the error message in test output
2. Review this documentation
3. Check API logs in Railway
4. Verify environment variables
5. Ensure dependencies are installed

---

## 📚 Additional Resources

- [Railway Deployment Guide](./RAILWAY_DEPLOY.md)
- [Environment Variables Guide](./.env.example)
- [API Documentation](./COMPLETE-API-ENDPOINTS.md)
- [Troubleshooting Guide](./TROUBLESHOOTING.md)
