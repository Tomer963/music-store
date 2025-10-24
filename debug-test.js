const http = require('http');

const BASE_URL = 'http://localhost:3000/api/v1';

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    const req = http.request(requestOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const jsonData = data ? JSON.parse(data) : {};
          console.log(`\n📍 ${options.method || 'GET'} ${url}`);
          console.log(`   Status: ${res.statusCode}`);
          console.log(`   Response:`, JSON.stringify(jsonData, null, 2));
          resolve({ status: res.statusCode, data: jsonData });
        } catch (e) {
          console.log(`\n📍 ${options.method || 'GET'} ${url}`);
          console.log(`   Status: ${res.statusCode}`);
          console.log(`   Response (raw):`, data);
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', (error) => {
      console.error(`❌ Error connecting to ${url}:`, error.message);
      reject(error);
    });
    
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    
    req.end();
  });
}

async function testErrors() {
  console.log('🔍 Testing the 3 failing tests:\n');
  
  try {
    // Test 1: 404 for nonexistent endpoints
    console.log('═══════════════════════════════════════');
    console.log('TEST 1: 404 for nonexistent endpoints');
    console.log('═══════════════════════════════════════');
    const test1 = await makeRequest(`${BASE_URL}/nonexistent-endpoint`);
    console.log(`✅ Expected: 404`);
    console.log(`✅ Got: ${test1.status}`);
    console.log(`${test1.status === 404 ? '✅ PASS' : '❌ FAIL'}`);
    
    // Test 2: Unauthorized POST rejected
    console.log('\n═══════════════════════════════════════');
    console.log('TEST 2: Unauthorized POST rejected');
    console.log('═══════════════════════════════════════');
    const test2 = await makeRequest(`${BASE_URL}/albums`, {
      method: 'POST',
      body: { title: 'Test' }
    });
    console.log(`✅ Expected: 401`);
    console.log(`✅ Got: ${test2.status}`);
    console.log(`${test2.status === 401 ? '✅ PASS' : '❌ FAIL'}`);
    
    // Test 3: Invalid request body handled
    console.log('\n═══════════════════════════════════════');
    console.log('TEST 3: Invalid request body handled');
    console.log('═══════════════════════════════════════');
    const testSessionId = `sess_${Date.now()}_test`;
    const test3 = await makeRequest(`${BASE_URL}/cart/items`, {
      method: 'POST',
      headers: { 'x-session-id': testSessionId },
      body: { invalid: 'data' }
    });
    console.log(`✅ Expected: 400`);
    console.log(`✅ Got: ${test3.status}`);
    console.log(`${test3.status === 400 ? '✅ PASS' : '❌ FAIL'}`);
    
    console.log('\n═══════════════════════════════════════');
    console.log('SUMMARY');
    console.log('═══════════════════════════════════════');
    const results = [
      test1.status === 404,
      test2.status === 401,
      test3.status === 400
    ];
    console.log(`Test 1 (404 nonexistent): ${results[0] ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Test 2 (401 unauthorized): ${results[1] ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Test 3 (400 invalid body): ${results[2] ? '✅ PASS' : '❌ FAIL'}`);
    
    const allPassed = results.every(r => r === true);
    console.log(`\n${allPassed ? '🎉 ALL TESTS PASSED!' : '⚠️ SOME TESTS FAILED'}`);
    
  } catch (error) {
    console.error('\n💥 Fatal error:', error.message);
    console.log('\n⚠️ Make sure your backend server is running on port 3000!');
    console.log('   Run: cd backend && npm start');
  }
}

testErrors();