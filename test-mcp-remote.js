// Script para probar la conexión MCP remota en desarrollo
const { listComponents } = require('./lib/mcp/client.ts');

async function testMCPRemote() {
  console.log('🔍 Probando conexión MCP remota...');
  console.log('URL:', process.env.MCP_BASE_URL || 'https://meli-xmcp-poc.vercel.app');
  console.log('Token:', process.env.MCP_AUTH_TOKEN ? 'Configurado' : 'No configurado');
  
  try {
    const result = await listComponents();
    console.log('✅ Éxito:', result);
  } catch (error) {
    console.log('❌ Error:', error.message);
    if (error.message.includes('Unauthorized') || error.message.includes('401')) {
      console.log('🔐 Error de autenticación - Se necesita MCP_AUTH_TOKEN');
    }
  }
}

testMCPRemote();
