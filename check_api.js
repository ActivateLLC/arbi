const https = require('https');

console.log('Starting checks...');

function check(url) {
  console.log(`Fetching ${url}...`);
  const req = https.get(url, (res) => {
    console.log(`Response received for ${url}`);
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      console.log(`\n--- ${url} ---`);
      console.log('Status:', res.statusCode);
      console.log('Body:', data.substring(0, 500));
    });
  });
  
  req.on('error', (err) => {
    console.error(`Error fetching ${url}:`, err.message);
  });
  
  req.setTimeout(5000, () => {
    console.error(`Timeout fetching ${url}`);
    req.abort();
  });
}

check('https://arbi-production.up.railway.app/health');
check('https://arbi-production.up.railway.app/api/autonomous/status');
check('https://arbi-production.up.railway.app/api/arbitrage/opportunities');
