import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { experimental_createMCPClient } from "ai";

const client = await experimental_createMCPClient({
	transport: new StreamableHTTPClientTransport(
		new URL(process.env.MCP_ENDPOINT || "http://localhost:3001/mcp"),
		{},
	),
});

export async function getMcpTools() {
	return await client.tools();
}
