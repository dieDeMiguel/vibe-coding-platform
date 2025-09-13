// Script para probar MCP remoto en development mode
async function testMCPDev() {
  const baseUrl = 'http://localhost:3000';
  
  console.log('🧪 Probando MCP remoto desde development mode...');
  console.log('Base URL:', baseUrl);
  
  try {
    // Test 1: Probar list_components
    console.log('\n1️⃣ Probando list_components...');
    const listResponse = await fetch(`${baseUrl}/api/xmcp/tools/list_components`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });
    
    console.log('Status:', listResponse.status);
    const listResult = await listResponse.json();
    console.log('Response:', listResult);
    
    if (listResponse.ok) {
      console.log('✅ list_components funcionó');
      
      // Test 2: Probar get_component
      console.log('\n2️⃣ Probando get_component...');
      const getResponse = await fetch(`${baseUrl}/api/xmcp/tools/get_component`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: 'Button' }),
      });
      
      console.log('Status:', getResponse.status);
      const getResult = await getResponse.json();
      console.log('Response:', getResult);
      
      if (getResponse.ok) {
        console.log('✅ get_component funcionó');
      } else {
        console.log('❌ get_component falló');
      }
    } else {
      console.log('❌ list_components falló');
      if (listResult.error && listResult.error.includes('Unauthorized')) {
        console.log('🔐 Error de autenticación detectado - MCP remoto requiere token');
      }
    }
    
  } catch (error) {
    console.error('❌ Error en la prueba:', error.message);
  }
}

// Solo ejecutar si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  testMCPDev();
}

export { testMCPDev };
