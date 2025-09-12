import { z } from "zod";

// Schema para cada archivo del registry item
export const registryFileSchema = z.object({
  name: z.string(),             // nombre del archivo ej. button.tsx
  content: z.string(),          // contenido del archivo
});

// Schema principal para el registry item
export const registryItemSchema = z.object({
  name: z.string(),             // identificador interno ej. "button"
  type: z.enum(["component", "hook", "utility"]).default("component"),
  title: z.string(),            // nombre legible ej. "Button"
  description: z.string().optional(),
  registryDependencies: z.array(z.string()).default([]),
  dependencies: z.array(z.string()).default([]),
  files: z.array(registryFileSchema),  // archivos que forman el componente
  category: z.string().default("UI"),
});

// Schema para la lista de componentes
export const registryIndexSchema = z.array(z.object({
  name: z.string(),
  title: z.string(),
  description: z.string().optional(),
  category: z.string().default("UI"),
}));

// Tipos TypeScript derivados de los schemas
export type RegistryFile = z.infer<typeof registryFileSchema>;
export type RegistryItem = z.infer<typeof registryItemSchema>;
export type RegistryIndex = z.infer<typeof registryIndexSchema>;
