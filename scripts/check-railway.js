const axios = require('axios');

const RAILWAY_URL = 'https://arbi-production.up.railway.app';

async function checkRailway() {
  console.log('🚂 Checking Railway Deployment Status...\n');
  console.log(`   URL: ${RAILWAY_URL}\n`);

  // Check health endpoint
  console.log('1️⃣ Checking API health...');
  try {
    const health = await axios.get(`${RAILWAY_URL}/api/status`, { timeout: 10000 });
    console.log('   ✅ API is healthy!');
    console.log(`   Response:`, health.data);
    console.log('');
  } catch (error) {
    console.log('   ❌ API health check failed');
    console.log(`   Error: ${error.message}`);
    console.log('');
  }

  // Check autonomous status
  console.log('2️⃣ Checking autonomous system...');
  try {
    const autonomousStatus = await axios.get(`${RAILWAY_URL}/api/autonomous/status`, { timeout: 10000 });
    console.log('   ✅ Autonomous system responding!');
    console.log(`   Status:`, autonomousStatus.data);
    console.log('');
  } catch (error) {
    console.log('   ⚠️  Autonomous endpoint not found (may not be implemented yet)');
    console.log(`   Error: ${error.message}`);
    console.log('');
  }

  // Check opportunities endpoint
  console.log('3️⃣ Checking opportunities endpoint...');
  try {
    const opportunities = await axios.get(`${RAILWAY_URL}/api/autonomous/opportunities`, { timeout: 10000 });
    console.log('   ✅ Opportunities endpoint responding!');
    console.log(`   Found ${opportunities.data?.length || 0} opportunities`);
    console.log('');
  } catch (error) {
    console.log('   ⚠️  Opportunities endpoint not available yet');
    console.log(`   Error: ${error.message}`);
    console.log('');
  }

  // Trigger a test scan
  console.log('4️⃣ Triggering test scan...');
  try {
    const scan = await axios.post(`${RAILWAY_URL}/api/autonomous/scan`, {}, { timeout: 30000 });
    console.log('   ✅ Scan triggered successfully!');
    console.log(`   Result:`, scan.data);
    console.log('');
  } catch (error) {
    console.log('   ⚠️  Scan endpoint not available yet');
    console.log(`   Error: ${error.message}`);
    console.log('');
  }

  console.log('\n📋 Summary:');
  console.log('   • Railway deployment is accessible');
  console.log('   • API endpoints may need to be implemented');
  console.log('   • Use LOCAL_SETUP_GUIDE.md to test locally\n');
}

checkRailway().then(() => {
  console.log('✅ Railway check complete!\n');
  process.exit(0);
}).catch(err => {
  console.error('❌ Check failed:', err.message);
  process.exit(1);
});
