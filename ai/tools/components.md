# Components Tool

This tool provides access to a catalog of pre-built UI components that can be integrated into applications running in the Vercel Sandbox. It connects to the XMCP (eXtended Model Context Protocol) server to discover and fetch component definitions.

## Capabilities

### List Components
- Discover available UI components in the catalog
- Search and filter components by name, tags, or package
- Get component metadata including descriptions, variants, and packages

### Fetch Components
- Retrieve complete component specifications including TypeScript code, props, and styling
- Generate component files directly in the sandbox
- Create demo pages for immediate component preview
- Support component variants with customized prop defaults

## Component Integration

When fetching components, this tool will:

1. **Generate Component Files**: Create TSX component files with full TypeScript definitions
2. **Include Styling**: Generate both CSS modules and SCSS files as available
3. **Create Metadata**: Add component.json files with specification details
4. **Generate Demos**: Optionally create demo pages under `/app/demo/[component]/page.tsx`
5. **Handle Dependencies**: Include required dependencies like `clsx` for className management

## Available Component Libraries

- **@meli/ui**: Core UI components (Button, Card, Input, Badge)
- **@meli/commerce**: E-commerce specific components (ProductCard)

Components include modern React patterns with TypeScript, CSS modules, responsive design, and accessibility features following Mercado Libre design system guidelines.

## Usage Context

This tool is designed for rapid prototyping and component integration within the Vibe Coding Platform. It enables quick insertion of production-ready UI components into sandbox applications without manual coding.

The tool automatically handles file generation, dependency management, and creates working examples that can be immediately previewed in the sandbox environment.
