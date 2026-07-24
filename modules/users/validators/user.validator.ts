import { z } from "zod";

const uniqueIds = (ids: string[]) => new Set(ids).size === ids.length;

const emailSchema = z
  .string()
  .trim()
  .email("El correo electrónico no es válido.")
  .transform((value) => value.toLowerCase());

const roleIdsSchema = z
  .array(z.string().uuid("El rol no es válido."))
  .refine(uniqueIds, "No se permiten roles duplicados.");

const unitsSchema = z
  .array(
    z.object({
      unitId: z.string().uuid("La unidad no es válida."),
      isPrimary: z.boolean(),
    }),
  )
  .refine(
    (units) => uniqueIds(units.map(({ unitId }) => unitId)),
    "No se permiten unidades duplicadas.",
  )
  .refine(
    (units) => units.filter(({ isPrimary }) => isPrimary).length <= 1,
    "Solo una unidad puede ser principal.",
  );

export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(150).optional(),
  status: z.enum(["activo", "inactivo"]).optional(),
  roleId: z.string().uuid().optional(),
  unitId: z.string().uuid().optional(),
});

export const createUserSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio.").max(150),
  email: emailSchema,
  password: z.string().min(1, "La contraseña es obligatoria."),
  roleIds: roleIdsSchema.default([]),
  units: unitsSchema.default([]),
});

export const updateUserSchema = z
  .object({
    name: z.string().trim().min(1).max(150).optional(),
    email: emailSchema.optional(),
    roleIds: roleIdsSchema.optional(),
    units: unitsSchema.optional(),
  })
  .refine(
    (input) => Object.values(input).some((value) => value !== undefined),
    "Debe indicar al menos un cambio.",
  );

export const resetPasswordSchema = z.object({
  password: z.string().min(1, "La contraseña es obligatoria."),
});

export const userIdSchema = z.string().uuid("El usuario no es válido.");

export type ListUsersQuery = z.output<typeof listUsersQuerySchema>;
export type CreateUserFormInput = z.input<typeof createUserSchema>;
export type CreateUserInput = z.output<typeof createUserSchema>;
export type UpdateUserInput = z.output<typeof updateUserSchema>;
export type ResetPasswordInput = z.output<typeof resetPasswordSchema>;
