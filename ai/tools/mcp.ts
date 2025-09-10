import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp";
import { experimental_createMCPClient } from "ai";

const client = await experimental_createMCPClient({
	transport: new StreamableHTTPClientTransport(
		"http://localhost:3000/api/xmcp",
		{},
	),
});

export async function getMcpTools() {
	return await client.tools();
}
