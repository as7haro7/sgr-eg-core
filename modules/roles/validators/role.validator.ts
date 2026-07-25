import { z } from "zod";

const permissionSchema = z.object({
  moduleCode: z.string().trim().min(1).max(40),
  canCreate: z.boolean().default(false),
  canRead: z.boolean().default(false),
  canUpdate: z.boolean().default(false),
  canDeactivate: z.boolean().default(false),
  scope: z.enum(["global", "unidad", "propio", "asignado"]),
});

export const createRoleSchema = z.object({
  name: z.string().trim().min(1).max(50),
  description: z
    .union([z.string().trim(), z.null()])
    .transform((value) => value || null),
  permissions: z
    .array(permissionSchema)
    .refine(
      (items) =>
        new Set(items.map(({ moduleCode }) => moduleCode)).size ===
        items.length,
      "No se puede repetir un módulo.",
    ),
});

export const updateRoleSchema = createRoleSchema
  .partial()
  .refine(
    (input) => Object.values(input).some((value) => value !== undefined),
    "Debe indicar al menos un cambio.",
  );

export const roleIdSchema = z.string().uuid("El rol no es válido.");
export type CreateRoleInput = z.output<typeof createRoleSchema>;
export type UpdateRoleInput = z.output<typeof updateRoleSchema>;
