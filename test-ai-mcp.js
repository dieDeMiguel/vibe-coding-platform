#!/usr/bin/env node

/**
 * Test script to verify AI can consume MCP components
 * Run with: node test-ai-mcp.js
 */

const BASE_URL = 'http://localhost:3000';

async function testAIChat() {
  console.log('🤖 Testing AI Chat integration with MCP components...\n');
  
  const testMessage = {
    messages: [
      {
        id: 'test-1',
        role: 'user',
        content: 'Create a Button component using the available components from MCP. Use the primary variant.',
        parts: [
          {
            type: 'text',
            text: 'Create a Button component using the available components from MCP. Use the primary variant.'
          }
        ]
      }
    ],
    modelId: 'google/gemini-2.5-flash'
  };

  try {
    console.log('📨 Sending chat message to AI...');
    const response = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testMessage)
    });

    if (response.ok) {
      console.log('✅ AI Chat responded successfully');
      console.log(`📊 Status: ${response.status}`);
      console.log(`📋 Content-Type: ${response.headers.get('content-type')}`);
      
      // Read the stream response
      const reader = response.body?.getReader();
      if (reader) {
        console.log('\n📝 AI Response Stream:');
        console.log('----------------------------------------');
        let chunks = 0;
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const text = new TextDecoder().decode(value);
          if (text.trim()) {
            chunks++;
            console.log(`Chunk ${chunks}: ${text.substring(0, 100)}${text.length > 100 ? '...' : ''}`);
          }
        }
        console.log('----------------------------------------');
        console.log(`✅ Received ${chunks} chunks from AI`);
      }
    } else {
      console.log(`❌ AI Chat failed: ${response.status}`);
      const errorText = await response.text();
      console.log(`Error: ${errorText}`);
    }
  } catch (error) {
    console.log(`❌ Network error: ${error.message}`);
  }
}

async function testComponentTools() {
  console.log('\n🔧 Testing Component Tools integration...\n');
  
  // Test if components tool is available
  const testTools = {
    messages: [
      {
        id: 'test-2',
        role: 'user',
        content: 'List all available components from the catalog',
        parts: [
          {
            type: 'text',
            text: 'List all available components from the catalog'
          }
        ]
      }
    ],
    modelId: 'google/gemini-2.5-flash'
  };

  try {
    console.log('🛠️ Testing component listing through AI...');
    const response = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testTools)
    });

    if (response.ok) {
      console.log('✅ Component tools accessible through AI');
    } else {
      console.log(`❌ Component tools test failed: ${response.status}`);
    }
  } catch (error) {
    console.log(`❌ Component tools test error: ${error.message}`);
  }
}

async function checkServerHealth() {
  try {
    const response = await fetch(`${BASE_URL}/api/xmcp/health`);
    if (response.ok) {
      const data = await response.json();
      console.log('✅ MCP Server is healthy');
      return true;
    }
  } catch (error) {
    console.log('❌ MCP Server not accessible');
    return false;
  }
  return false;
}

// Main execution
(async () => {
  console.log('🚀 Testing AI + MCP Integration\n');
  
  const healthy = await checkServerHealth();
  if (!healthy) {
    console.log('💡 Please ensure the development server is running: pnpm dev');
    process.exit(1);
  }
  
  await testAIChat();
  await testComponentTools();
  
  console.log('\n🏁 Tests completed!');
  console.log('\n💡 If AI can access components, you should see:');
  console.log('   - Successful response from /api/chat');
  console.log('   - AI using component tools in the response stream');
  console.log('   - Component generation or listing in the output');
})();
