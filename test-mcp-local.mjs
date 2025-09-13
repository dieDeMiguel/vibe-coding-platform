// Script para probar MCP local en puerto 3001
async function testMCPLocal() {
  const mcpUrl = 'http://localhost:3001/mcp';
  const token = '36cefd998bf9d7fa9c193f6b98df01754ec1247fe1f8c9127d858fe7d448d2bd';
  
  console.log('🧪 Probando MCP local en puerto 3001...');
  console.log('URL:', mcpUrl);
  
  try {
    // Test 1: Sin autenticación
    console.log('\n1️⃣ Probando sin autenticación...');
    const responseNoAuth = await fetch(mcpUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          name: 'list_components',
          arguments: {}
        }
      }),
    });
    
    console.log('Status (sin auth):', responseNoAuth.status);
    const resultNoAuth = await responseNoAuth.text();
    console.log('Response (sin auth):', resultNoAuth.substring(0, 200) + '...');
    
    // Test 2: Con autenticación
    console.log('\n2️⃣ Probando con autenticación Bearer...');
    const responseWithAuth = await fetch(mcpUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          name: 'list_components',
          arguments: {}
        }
      }),
    });
    
    console.log('Status (con auth):', responseWithAuth.status);
    const resultWithAuth = await responseWithAuth.text();
    console.log('Response (con auth):', resultWithAuth.substring(0, 200) + '...');
    
    // Test 3: Health check
    console.log('\n3️⃣ Probando health check...');
    const healthResponse = await fetch('http://localhost:3002/health', {
      method: 'GET',
    });
    
    console.log('Health status:', healthResponse.status);
    if (healthResponse.ok) {
      const healthResult = await healthResponse.json();
      console.log('Health response:', JSON.stringify(healthResult, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Error en la prueba:', error.message);
  }
}

testMCPLocal();
