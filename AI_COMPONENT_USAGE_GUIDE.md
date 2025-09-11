# 🤖 AI Component Usage Guide

## ⚠️ CRITICAL INSTRUCTIONS FOR AI/LLM

When using components from the MCP catalog, follow these rules **EXACTLY** to avoid build errors:

### ✅ CORRECT USAGE

#### 1. Import Pattern
```tsx
// ✅ ALWAYS use this pattern
import { Button } from '@/components/Button/Button'
import { Card } from '@/components/Card/Card'
```

#### 2. Component Usage
```tsx
// ✅ CORRECT - Pass children as JSX content
function MyComponent() {
  return (
    <Button variant="primary" size="md">
      Click me
    </Button>
  )
}
```

#### 3. Props Usage
```tsx
// ✅ CORRECT - Only use documented props
<Button 
  variant="primary"    // ✅ Valid prop
  size="md"           // ✅ Valid prop  
  disabled={false}    // ✅ Valid prop
  onClick={() => {}}  // ✅ Valid prop
>
  Button Text
</Button>
```

### ❌ COMMON MISTAKES TO AVOID

#### 1. Package Imports (WILL FAIL)
```tsx
// ❌ NEVER do this - package doesn't exist
import { Button } from '@meli/ui'
import { Card } from '@meli/ui'
```

#### 2. Duplicate Children
```tsx
// ❌ WRONG - Don't pass children as both prop AND content
<Button children="Text">
  Also Text  {/* This creates conflict */}
</Button>

// ✅ CORRECT - Choose one approach
<Button>Button Text</Button>
```

#### 3. Invalid Props
```tsx
// ❌ WRONG - Using props not in the interface
<Button 
  color="red"        // ❌ Not a valid prop
  theme="dark"       // ❌ Not a valid prop
  customProp="value" // ❌ Not a valid prop
>
  Text
</Button>
```

#### 4. Relative Imports
```tsx
// ❌ WRONG - Relative imports may fail
import { Button } from '../components/Button'
import { Card } from './Card'

// ✅ CORRECT - Use absolute paths
import { Button } from '@/components/Button/Button'
import { Card } from '@/components/Card/Card'
```

### 📋 COMPONENT CHECKLIST

Before using any component, verify:

1. ✅ Import uses full path: `@/components/ComponentName/ComponentName`
2. ✅ Props are documented in the component's README or component.json
3. ✅ Children are passed as JSX content, not as a prop
4. ✅ No package imports from `@meli/ui`

### 🔧 DEBUGGING TIPS

If you get errors:

- **"Module not found"** → Check import path
- **"Property X does not exist"** → Check valid props in component.json
- **"Duplicate parameter"** → Component generation issue, regenerate
- **"Package not found @meli/ui"** → Don't use package imports

### 📚 EXAMPLES BY COMPONENT

#### Button Component
```tsx
import { Button } from '@/components/Button/Button'

// All valid variants
<Button variant="primary">Primary</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="tertiary">Tertiary</Button>

// All valid sizes  
<Button size="xs">Extra Small</Button>
<Button size="sm">Small</Button>
<Button size="md">Medium</Button>
<Button size="lg">Large</Button>
<Button size="xl">Extra Large</Button>

// States
<Button disabled>Disabled</Button>
<Button loading>Loading</Button>
```

#### Card Component
```tsx
import { Card } from '@/components/Card/Card'

// Basic usage
<Card>
  <h2>Card Title</h2>
  <p>Card content goes here</p>
</Card>

// With variants
<Card variant="elevated">Elevated card</Card>
<Card variant="outlined">Outlined card</Card>

// With padding
<Card padding="sm">Small padding</Card>
<Card padding="lg">Large padding</Card>

// Clickable
<Card clickable onClick={() => console.log('clicked')}>
  Clickable card
</Card>
```

## 🎯 SUMMARY

**ALWAYS:**
- Use `@/components/ComponentName/ComponentName` imports
- Check component.json for valid props
- Pass children as JSX content

**NEVER:**
- Import from `@meli/ui`
- Use undocumented props
- Pass children as both prop and content
