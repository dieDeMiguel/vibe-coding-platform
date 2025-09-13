// Script simple para probar MCP remoto
import fetch from 'node-fetch';

async function testMCP() {
  console.log('🧪 Probando MCP remoto desde localhost:3000...');
  
  try {
    const response = await fetch('http://localhost:3000/api/xmcp/tools/list_components', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });
    
    console.log(`📡 Status: ${response.status}`);
    
    const result = await response.text();
    console.log(`📄 Response: ${result}`);
    
    if (response.status === 401 || result.includes('Unauthorized')) {
      console.log('🔐 ¡ÉXITO! Se detectó error de autenticación - MCP remoto está siendo usado');
    } else if (response.ok) {
      console.log('✅ Funcionó - pero puede estar usando cache o fake server');
    } else {
      console.log(`❌ Error inesperado: ${response.status}`);
    }
    
  } catch (error) {
    console.error('❌ Error de conexión:', error.message);
  }
}

testMCP();
