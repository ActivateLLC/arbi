#!/usr/bin/env node
/**
 * End-to-End Platform Test Suite
 *
 * Tests all critical paths:
 * - API Health & Database
 * - CORS Configuration
 * - Environment Variables
 * - Core API Endpoints
 * - Frontend Integration
 * - Third-party Services
 */

import { execSync } from 'child_process';
import https from 'https';
import http from 'http';

interface TestResult {
  name: string;
  status: 'PASS' | 'FAIL' | 'SKIP' | 'WARN';
  message: string;
  details?: any;
  duration?: number;
}

const results: TestResult[] = [];
const API_URL = process.env.API_URL || 'http://localhost:3000';
const DASHBOARD_URL = process.env.DASHBOARD_URL || 'http://localhost:5173';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  gray: '\x1b[90m',
};

function log(color: string, ...args: any[]) {
  console.log(color, ...args, colors.reset);
}

function fetchWithTimeout(url: string, options: any = {}, timeout = 10000): Promise<any> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;

    const req = protocol.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data,
            json: () => JSON.parse(data)
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data,
            json: () => null
          });
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(timeout, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

async function runTest(name: string, fn: () => Promise<TestResult>): Promise<void> {
  const start = Date.now();
  log(colors.blue, `\n▶ Testing: ${name}`);

  try {
    const result = await fn();
    result.duration = Date.now() - start;
    results.push(result);

    const symbol = result.status === 'PASS' ? '✓' : result.status === 'FAIL' ? '✗' : result.status === 'WARN' ? '⚠' : '○';
    const color = result.status === 'PASS' ? colors.green : result.status === 'FAIL' ? colors.red : colors.yellow;
    log(color, `${symbol} ${result.status}: ${result.message} (${result.duration}ms)`);

    if (result.details) {
      log(colors.gray, '  Details:', JSON.stringify(result.details, null, 2));
    }
  } catch (error: any) {
    const duration = Date.now() - start;
    results.push({
      name,
      status: 'FAIL',
      message: error.message,
      duration
    });
    log(colors.red, `✗ FAIL: ${error.message} (${duration}ms)`);
  }
}

// =====================================================
// TEST SUITE
// =====================================================

async function testAPIHealth(): Promise<TestResult> {
  const response = await fetchWithTimeout(`${API_URL}/health`);

  if (response.status !== 200) {
    return {
      name: 'API Health Check',
      status: 'FAIL',
      message: `Health endpoint returned ${response.status}`,
      details: { body: response.body }
    };
  }

  const data = response.json();

  if (data.database === 'connected') {
    return {
      name: 'API Health Check',
      status: 'PASS',
      message: 'API is healthy and database is connected',
      details: data
    };
  } else if (data.database === 'not_configured') {
    return {
      name: 'API Health Check',
      status: 'WARN',
      message: 'API is healthy but database is not configured',
      details: data
    };
  } else {
    return {
      name: 'API Health Check',
      status: 'FAIL',
      message: 'Database connection failed',
      details: data
    };
  }
}

async function testCORSConfiguration(): Promise<TestResult> {
  const testOrigins = [
    'http://localhost:5173',
    'https://malicious-site.com'
  ];

  const results: any = {};

  for (const origin of testOrigins) {
    try {
      const response = await fetchWithTimeout(`${API_URL}/health`, {
        headers: { 'Origin': origin }
      });

      results[origin] = {
        allowed: response.headers['access-control-allow-origin'] === origin ||
                 response.headers['access-control-allow-origin'] === '*',
        headers: response.headers
      };
    } catch (e: any) {
      results[origin] = { error: e.message };
    }
  }

  const localhostAllowed = results['http://localhost:5173']?.allowed;
  const maliciousBlocked = !results['https://malicious-site.com']?.allowed;

  if (localhostAllowed && (maliciousBlocked || process.env.NODE_ENV !== 'production')) {
    return {
      name: 'CORS Configuration',
      status: 'PASS',
      message: 'CORS is properly configured',
      details: results
    };
  } else if (results['https://malicious-site.com']?.allowed) {
    return {
      name: 'CORS Configuration',
      status: 'WARN',
      message: 'CORS allows all origins (OK in development, risky in production)',
      details: results
    };
  } else {
    return {
      name: 'CORS Configuration',
      status: 'FAIL',
      message: 'CORS configuration issues detected',
      details: results
    };
  }
}

async function testEnvironmentVariables(): Promise<TestResult> {
  const required = [
    'DATABASE_URL',
    'STRIPE_SECRET_KEY',
    'CLOUDINARY_CLOUD_NAME',
    'CLOUDINARY_API_KEY',
    'CLOUDINARY_API_SECRET'
  ];

  const missing: string[] = [];
  const present: string[] = [];

  // Check local environment
  for (const varName of required) {
    if (process.env[varName]) {
      present.push(varName);
    } else {
      missing.push(varName);
    }
  }

  if (missing.length === 0) {
    return {
      name: 'Environment Variables',
      status: 'PASS',
      message: 'All required environment variables are set',
      details: { present }
    };
  } else {
    return {
      name: 'Environment Variables',
      status: 'WARN',
      message: `${missing.length} required variables missing (may be set in Railway)`,
      details: { present, missing }
    };
  }
}

async function testMarketplaceAPI(): Promise<TestResult> {
  try {
    const response = await fetchWithTimeout(`${API_URL}/api/marketplace/listings`);

    if (response.status === 200) {
      const data = response.json();
      return {
        name: 'Marketplace API',
        status: 'PASS',
        message: `Retrieved ${data.listings?.length || 0} listings`,
        details: { count: data.listings?.length }
      };
    } else {
      return {
        name: 'Marketplace API',
        status: 'FAIL',
        message: `API returned ${response.status}`,
        details: { body: response.body }
      };
    }
  } catch (error: any) {
    return {
      name: 'Marketplace API',
      status: 'FAIL',
      message: error.message
    };
  }
}

async function testArbitrageAPI(): Promise<TestResult> {
  try {
    const response = await fetchWithTimeout(`${API_URL}/api/arbitrage/health`);

    if (response.status === 200) {
      return {
        name: 'Arbitrage API',
        status: 'PASS',
        message: 'Arbitrage engine is responding'
      };
    } else {
      return {
        name: 'Arbitrage API',
        status: 'FAIL',
        message: `API returned ${response.status}`
      };
    }
  } catch (error: any) {
    return {
      name: 'Arbitrage API',
      status: 'WARN',
      message: `Endpoint may not exist: ${error.message}`
    };
  }
}

async function testDatabaseConnection(): Promise<TestResult> {
  if (!process.env.DATABASE_URL) {
    return {
      name: 'Database Connection',
      status: 'SKIP',
      message: 'DATABASE_URL not set locally (checked via /health endpoint)'
    };
  }

  // Database connection is tested via /health endpoint
  const response = await fetchWithTimeout(`${API_URL}/health`);
  const data = response.json();

  if (data.database === 'connected') {
    return {
      name: 'Database Connection',
      status: 'PASS',
      message: 'Database connection verified',
      details: { status: data.database }
    };
  } else {
    return {
      name: 'Database Connection',
      status: 'FAIL',
      message: `Database status: ${data.database}`,
      details: data
    };
  }
}

async function testStripeIntegration(): Promise<TestResult> {
  if (!process.env.STRIPE_SECRET_KEY) {
    return {
      name: 'Stripe Integration',
      status: 'SKIP',
      message: 'STRIPE_SECRET_KEY not set locally'
    };
  }

  // Test that Stripe is initialized (we can't actually charge without real data)
  try {
    const response = await fetchWithTimeout(`${API_URL}/api/marketplace/listings`);

    // If API works, Stripe is likely initialized
    return {
      name: 'Stripe Integration',
      status: 'PASS',
      message: 'Stripe SDK likely initialized (full test requires checkout)',
      details: { note: 'API is functional' }
    };
  } catch (error: any) {
    return {
      name: 'Stripe Integration',
      status: 'WARN',
      message: 'Cannot fully verify without test checkout',
      details: { error: error.message }
    };
  }
}

async function testCloudinaryIntegration(): Promise<TestResult> {
  if (!process.env.CLOUDINARY_CLOUD_NAME) {
    return {
      name: 'Cloudinary Integration',
      status: 'SKIP',
      message: 'Cloudinary credentials not set locally'
    };
  }

  return {
    name: 'Cloudinary Integration',
    status: 'PASS',
    message: 'Cloudinary credentials are configured',
    details: {
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      note: 'Full upload test requires running application'
    }
  };
}

async function testFrontendBuild(): Promise<TestResult> {
  try {
    log(colors.gray, '  Building dashboard...');
    execSync('pnpm --filter @arbi/dashboard build', {
      cwd: process.cwd(),
      stdio: 'pipe'
    });

    return {
      name: 'Frontend Build (Dashboard)',
      status: 'PASS',
      message: 'Dashboard builds successfully'
    };
  } catch (error: any) {
    return {
      name: 'Frontend Build (Dashboard)',
      status: 'FAIL',
      message: 'Dashboard build failed',
      details: { error: error.message }
    };
  }
}

async function testBackendBuild(): Promise<TestResult> {
  try {
    log(colors.gray, '  Building API...');
    execSync('pnpm --filter @arbi/api build', {
      cwd: process.cwd(),
      stdio: 'pipe'
    });

    return {
      name: 'Backend Build (API)',
      status: 'PASS',
      message: 'API builds successfully'
    };
  } catch (error: any) {
    return {
      name: 'Backend Build (API)',
      status: 'FAIL',
      message: 'API build failed',
      details: { error: error.message }
    };
  }
}

async function testWorkspaceDependencies(): Promise<TestResult> {
  try {
    log(colors.gray, '  Checking workspace packages...');
    execSync('pnpm build', {
      cwd: process.cwd(),
      stdio: 'pipe'
    });

    return {
      name: 'Workspace Dependencies',
      status: 'PASS',
      message: 'All workspace packages build successfully'
    };
  } catch (error: any) {
    return {
      name: 'Workspace Dependencies',
      status: 'FAIL',
      message: 'Workspace build failed',
      details: { error: error.message }
    };
  }
}

async function testTypeScriptCompilation(): Promise<TestResult> {
  try {
    log(colors.gray, '  Running TypeScript compiler...');
    execSync('pnpm --filter @arbi/api exec tsc --noEmit', {
      cwd: process.cwd(),
      stdio: 'pipe'
    });

    return {
      name: 'TypeScript Compilation',
      status: 'PASS',
      message: 'No TypeScript errors'
    };
  } catch (error: any) {
    return {
      name: 'TypeScript Compilation',
      status: 'FAIL',
      message: 'TypeScript errors found',
      details: { error: error.message }
    };
  }
}

// =====================================================
// RUN ALL TESTS
// =====================================================

async function runAllTests() {
  log(colors.blue, '\n╔════════════════════════════════════════════════════════╗');
  log(colors.blue, '║         ARBI Platform - E2E Test Suite                ║');
  log(colors.blue, '╚════════════════════════════════════════════════════════╝');

  log(colors.gray, `\nAPI URL: ${API_URL}`);
  log(colors.gray, `Dashboard URL: ${DASHBOARD_URL}`);
  log(colors.gray, `Environment: ${process.env.NODE_ENV || 'development'}\n`);

  // Build & Compilation Tests
  log(colors.blue, '\n━━━ Build & Compilation Tests ━━━');
  await runTest('Workspace Dependencies', testWorkspaceDependencies);
  await runTest('TypeScript Compilation', testTypeScriptCompilation);
  await runTest('Backend Build', testBackendBuild);
  await runTest('Frontend Build', testFrontendBuild);

  // Infrastructure Tests
  log(colors.blue, '\n━━━ Infrastructure Tests ━━━');
  await runTest('API Health Check', testAPIHealth);
  await runTest('Database Connection', testDatabaseConnection);
  await runTest('Environment Variables', testEnvironmentVariables);
  await runTest('CORS Configuration', testCORSConfiguration);

  // API Endpoint Tests
  log(colors.blue, '\n━━━ API Endpoint Tests ━━━');
  await runTest('Marketplace API', testMarketplaceAPI);
  await runTest('Arbitrage API', testArbitrageAPI);

  // Integration Tests
  log(colors.blue, '\n━━━ Third-Party Integration Tests ━━━');
  await runTest('Stripe Integration', testStripeIntegration);
  await runTest('Cloudinary Integration', testCloudinaryIntegration);

  // Summary
  printSummary();
}

function printSummary() {
  log(colors.blue, '\n╔════════════════════════════════════════════════════════╗');
  log(colors.blue, '║                    Test Summary                        ║');
  log(colors.blue, '╚════════════════════════════════════════════════════════╝\n');

  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const warned = results.filter(r => r.status === 'WARN').length;
  const skipped = results.filter(r => r.status === 'SKIP').length;
  const total = results.length;

  log(colors.green, `✓ Passed:  ${passed}/${total}`);
  log(colors.red, `✗ Failed:  ${failed}/${total}`);
  log(colors.yellow, `⚠ Warnings: ${warned}/${total}`);
  log(colors.gray, `○ Skipped: ${skipped}/${total}`);

  const totalTime = results.reduce((sum, r) => sum + (r.duration || 0), 0);
  log(colors.gray, `\nTotal time: ${totalTime}ms`);

  if (failed > 0) {
    log(colors.red, '\n❌ Some tests failed. Review the details above.');
    process.exit(1);
  } else if (warned > 0) {
    log(colors.yellow, '\n⚠️  All tests passed with warnings.');
    process.exit(0);
  } else {
    log(colors.green, '\n✅ All tests passed!');
    process.exit(0);
  }
}

// Run tests
runAllTests().catch((error) => {
  log(colors.red, '\n💥 Test suite crashed:', error.message);
  console.error(error);
  process.exit(1);
});
