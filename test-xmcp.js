#!/usr/bin/env node

/**
 * Quick test script for XMCP API endpoints
 * Run with: node test-xmcp.js
 */

const BASE_URL = 'http://localhost:3000/api/xmcp';

async function testEndpoint(name, url, options = {}) {
  console.log(`\n🧪 Testing ${name}...`);
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log(`✅ ${name}: SUCCESS`);
      if (options.showResponse) {
        console.log(JSON.stringify(data, null, 2));
      } else {
        console.log(`   Status: ${data.status || 'OK'}`);
        if (data.items) console.log(`   Items: ${data.items.length}`);
        if (data.component) console.log(`   Component: ${data.component.name}`);
        if (data.catalog) console.log(`   Components: ${data.catalog.totalComponents || data.catalog.components}`);
      }
    } else {
      console.log(`❌ ${name}: FAILED (${response.status})`);
      console.log(`   Error: ${data.error || data.message}`);
    }
  } catch (error) {
    console.log(`❌ ${name}: ERROR`);
    console.log(`   ${error.message}`);
  }
}

async function runTests() {
  console.log('🚀 Starting XMCP API Tests');
  console.log(`📡 Base URL: ${BASE_URL}`);
  
  // Test GET endpoints
  await testEndpoint('API Documentation', `${BASE_URL}`);
  await testEndpoint('Health Check', `${BASE_URL}/health`);
  await testEndpoint('Catalog Info', `${BASE_URL}/catalog`);
  
  // Test component tools
  await testEndpoint('List All Components', `${BASE_URL}/tools/list_components`, {
    method: 'POST',
    body: JSON.stringify({})
  });
  
  await testEndpoint('Search Buttons', `${BASE_URL}/tools/list_components`, {
    method: 'POST',
    body: JSON.stringify({ query: 'button' })
  });
  
  await testEndpoint('Filter by Tags', `${BASE_URL}/tools/list_components`, {
    method: 'POST',
    body: JSON.stringify({ tags: ['form', 'action'] })
  });
  
  await testEndpoint('Get Button Component', `${BASE_URL}/tools/get_component`, {
    method: 'POST',
    body: JSON.stringify({ name: 'Button' })
  });
  
  await testEndpoint('Get Button Primary Variant', `${BASE_URL}/tools/get_component`, {
    method: 'POST',
    body: JSON.stringify({ name: 'Button', variant: 'primary' })
  });
  
  await testEndpoint('Get Card Component', `${BASE_URL}/tools/get_component`, {
    method: 'POST',
    body: JSON.stringify({ name: 'Card' })
  });
  
  // Test error handling
  await testEndpoint('Invalid Component', `${BASE_URL}/tools/get_component`, {
    method: 'POST',
    body: JSON.stringify({ name: 'InvalidComponent' })
  });
  
  // Test development endpoints (if in dev mode)
  await testEndpoint('Dev Utilities', `${BASE_URL}/dev`);
  
  await testEndpoint('Validate Catalog', `${BASE_URL}/dev`, {
    method: 'POST',
    body: JSON.stringify({ action: 'validate' })
  });
  
  console.log('\n🏁 Tests completed!');
  console.log('\n📖 Available components should include:');
  console.log('   - Button (with variants: primary, secondary, danger, small-primary)');
  console.log('   - Card (with variants: default, elevated, product-card)');
  console.log('   - Input (with variants: default, email, password, search)');
  console.log('   - Badge (with variants: new, sale, notification)');
  console.log('   - ProductCard (with variants: grid-item, list-item, featured)');
}

// Check if server is running
async function checkServer() {
  try {
    const response = await fetch(`${BASE_URL}/health`);
    if (response.ok) {
      return true;
    }
  } catch (error) {
    return false;
  }
  return false;
}

// Main execution
(async () => {
  console.log('⚡ Checking if server is running...');
  
  const serverRunning = await checkServer();
  if (!serverRunning) {
    console.log('❌ Server not running!');
    console.log('📝 Please start the development server first:');
    console.log('   npm run dev');
    console.log('📡 Then access: http://localhost:3000');
    process.exit(1);
  }
  
  console.log('✅ Server is running!');
  await runTests();
})();
