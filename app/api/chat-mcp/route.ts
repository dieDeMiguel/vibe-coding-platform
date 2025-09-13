import { convertToModelMessages, streamText, tool } from "ai";
import type { UIMessage } from "ai";
import { openai } from "@ai-sdk/openai";
import { getNormalizedTools } from "@/lib/mcp/client";
import { z } from "zod";

export const maxDuration = 30;

export async function POST(request: Request) {
  try {
    const { messages, model = "gpt-4o-mini" }: { messages: UIMessage[]; model?: string } =
      await request.json();

    // Get normalized tools
    const normalizedTools = getNormalizedTools();

    const result = streamText({
      model: openai(model),
      tools: {
        ...normalizedTools,
        // Add local tools if needed
        "hello-local": tool({
          description: "Receive a greeting",
          parameters: z.object({
            name: z.string(),
          }),
          execute: async (args) => {
            return `Hello ${args.name}!`;
          },
        }),
      },
      messages: convertToModelMessages(messages),
      system: `You are a helpful assistant that can help users find and work with UI components.
      
You have access to MCP tools that return normalized ShadCN-compatible registry items:
- get_component: Returns a complete component with TypeScript, CSS, and dependencies
- list_components: Returns a list of available components

All component data is automatically normalized to the ShadCN registry format, so you can directly help users with:
- Finding components by name or description
- Generating complete component code
- Providing installation instructions
- Explaining component props and usage

Always provide helpful, accurate information about the components.`,
    });

    return result.toDataStreamResponse({
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    });

  } catch (error) {
    console.error('Chat MCP endpoint error:', error);
    
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      }),
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      }
    );
  }
}
