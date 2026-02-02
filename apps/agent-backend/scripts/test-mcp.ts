
import { initializeMcpTools } from '../src/tools/index.js';
import { executeTool } from '../src/tools/index.js';

async function run() {
  console.log("🚀 Testing MCP Integration...");
  
  // 1. Initialize (starts MCP server)
  await initializeMcpTools();
  
  // 2. List Directory
  console.log("\n📂 Testing mcp_list_directory...");
  const listResult = await executeTool('mcp_list_directory', { path: '.' });
  console.log("Result:", listResult);
  
  // 3. Write File
  console.log("\n✍️ Testing mcp_write_file...");
  const writeResult = await executeTool('mcp_write_file', { 
    path: 'mcp-test.txt', 
    content: 'Hello from MCP Agent!' 
  });
  console.log("Result:", writeResult);
  
  // 4. Read File
  console.log("\n📖 Testing mcp_read_file...");
  const readResult = await executeTool('mcp_read_file', { path: 'mcp-test.txt' });
  console.log("Result:", readResult);
  
  console.log("\n✅ Test Complete");
  process.exit(0);
}

run().catch(console.error);
