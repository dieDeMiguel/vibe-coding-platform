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

The platform connects to a remote MCP server to fetch UI components:

### Connection Configuration
- **MCP Server**: Configurable via environment variables
- **Development**: `http://localhost:3001/mcp` (local MCP server)
- **Production**: Set via `MCP_BASE_URL` and `MCP_ENDPOINT` environment variables
- **Protocol**: JSON-RPC over HTTP

### Component Workflow
1. **Discovery**: Query MCP server for available components using `list_components`
2. **Fetching**: Retrieve component specifications via `get_component`
3. **Generation**: Create local component files in Vercel Sandbox
4. **Integration**: Import components as files: `import { Button } from '@/components/Button/Button'`

### Architecture Components
- `lib/mcp/client.ts`: MCP client connection and component fetching
- `lib/mcp/normalizer.ts`: Component specification normalization with AI
- `ai/tools/components.ts`: Component discovery and fetching logic
- `app/api/chat/route.ts`: AI chat endpoint with MCP tool integration

## Environment Setup

Create a `.env.local` file with the following variables:

```bash
# MCP Server Configuration (Production)
MCP_BASE_URL=https://your-mcp-server.vercel.app
MCP_ENDPOINT=https://your-mcp-server.vercel.app/mcp
MCP_AUTH_TOKEN=your_mcp_auth_token

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
- `lib/mcp/client.ts`: MCP client configuration and connection
- `lib/mcp/normalizer.ts`: Component normalization with AI
- `ai/tools/components.ts`: Component management tools
- `app/api/chat/route.ts`: AI chat API endpoint
- `app/api/chat/prompt.md`: AI system prompt

## Testing MCP Connection

Test the MCP server connection:

```bash
# Test local MCP server (development)
curl -X POST http://localhost:3001/mcp/v1/tools/call \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "list_components",
      "arguments": {}
    }
  }'

# Test remote MCP server (production)
curl -X POST $MCP_ENDPOINT \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $MCP_AUTH_TOKEN" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "list_components",
      "arguments": {}
    }
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