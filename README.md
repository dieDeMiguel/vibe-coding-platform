# Vibe Coding Platform

A Next.js-based AI coding assistant that integrates with Vercel Sandbox and Model Context Protocol (MCP) to provide intelligent code generation and component management capabilities.

## Overview

This platform enables AI agents to build and run full applications within secure, ephemeral Vercel Sandbox environments. It connects to remote MCP servers to discover and fetch UI components, then generates local files for immediate use in development projects.

## Key Features

- **AI-Powered Code Generation**: Intelligent assistance for building applications
- **Vercel Sandbox Integration**: Secure, isolated development environments
- **MCP Component Discovery**: Connect to remote component catalogs
- **Real-time File Management**: Generate, modify, and manage code files
- **Live Preview**: Instant preview of running applications
- **Component Library**: Access to pre-built UI components

## MCP Integration

The platform connects to a remote MCP server to fetch UI components through a multi-layered architecture:

### Connection Configuration
- **MCP Server**: `https://meli-xmcp-poc.vercel.app/mcp`
- **Environment Variables**: `MCP_BASE_URL` and `MCP_ENDPOINT`
- **Protocol**: JSON-RPC over HTTP

### Component Workflow
1. **Discovery**: Query MCP server for available components using `list_components`
2. **Fetching**: Retrieve component specifications via `get_component`
3. **Generation**: Create local component files in Vercel Sandbox
4. **Integration**: Import components as files: `import { Button } from '@/components/Button/Button'`

### Architecture Components
- `ai/tools/mcp.ts`: MCP client connection using Vercel AI SDK
- `ai/tools/components.ts`: Component discovery and fetching logic
- `ai/tools/components/file-generator.ts`: Local file generation from MCP specs
- `app/api/chat/route.ts`: AI chat endpoint with MCP tool integration

## Environment Setup

Create a `.env.local` file with the following variables:

```bash
# MCP Server Configuration
MCP_BASE_URL=https://meli-xmcp-poc.vercel.app
MCP_ENDPOINT=https://meli-xmcp-poc.vercel.app/mcp

# AI Gateway Configuration
VERCEL_OIDC_TOKEN=your_vercel_oidc_token
AI_GATEWAY_BASE_URL=https://gateway.ai.vercel.com/api/v1
```

## Getting Started

1. **Install Dependencies**:
   ```bash
   pnpm install
   ```

2. **Configure Environment**:
   - Copy `.env.local.example` to `.env.local`
   - Add your Vercel OIDC token

3. **Start Development Server**:
   ```bash
   pnpm dev
   ```

4. **Access the Platform**:
   - Open [http://localhost:3000](http://localhost:3000)
   - Start chatting with the AI assistant

## Available Tools

### AI Tools
- **Create Sandbox**: Initialize new Vercel Sandbox environments
- **Generate Files**: Create and manage code files
- **Run Commands**: Execute shell commands in sandbox
- **Get Sandbox URL**: Access live preview URLs
- **MCP Components**: Discover and fetch UI components

### MCP Tools
- **List Components**: Browse available component catalog
- **Get Component**: Fetch specific component specifications
- **Generate Component Files**: Create local component implementations

## Component Usage

When working with MCP components:

1. **Discover**: Use the AI assistant to list available components
2. **Fetch**: Request specific components from the MCP server
3. **Generate**: Create local files in your sandbox
4. **Import**: Use standard import syntax for generated files

**Important**: MCP components are generated as local files, not npm packages. Always import from generated files, never from non-existent packages.

## Development

### Project Structure
```
├── ai/                    # AI tools and MCP integration
├── app/                   # Next.js app directory
├── components/            # UI components
├── lib/                   # Utility libraries
└── public/               # Static assets
```

### Key Files
- `ai/tools/mcp.ts`: MCP client configuration
- `ai/tools/components.ts`: Component management
- `app/api/chat/route.ts`: AI chat API endpoint
- `app/api/chat/prompt.md`: AI system prompt

## Testing MCP Connection

Test the MCP server connection:

```bash
curl -X POST https://meli-xmcp-poc.vercel.app/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list",
    "params": {}
  }'
```

## Deployment

The platform is designed to be deployed on Vercel:

1. **Connect Repository**: Link your GitHub repository to Vercel
2. **Configure Environment**: Set environment variables in Vercel dashboard
3. **Deploy**: Automatic deployment on push to main branch

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is licensed under the MIT License.