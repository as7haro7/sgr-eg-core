import { z } from "zod";

const dateSchema = z.union([
  z.date(),
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "La fecha no es válida.")
    .transform((value) => new Date(`${value}T00:00:00.000Z`)),
  z
    .string()
    .datetime({ offset: true, message: "La fecha no es válida." })
    .transform((value) => new Date(value)),
]);

const optionalDate = z
  .union([dateSchema, z.literal(""), z.null()])
  .optional()
  .transform((value) => (value === "" || value === undefined ? null : value));

// ── Normativas ───────────────────────────────────────────────────────────────

export const createRegulationSchema = z
  .object({
    name: z.string().trim().min(1, "El nombre es obligatorio.").max(200),
    jurisdiction: z
      .string()
      .trim()
      .min(1, "La jurisdicción es obligatoria.")
      .max(100),
    countryId: z
      .union([z.string().uuid("El país no es válido."), z.literal(""), z.null()])
      .optional()
      .transform((value) => value || null),
    version: z.string().trim().min(1, "La versión es obligatoria.").max(30),
    validFrom: dateSchema,
    validUntil: optionalDate,
  })
  .refine(
    (data) =>
      data.validUntil === null || data.validUntil >= data.validFrom,
    { message: "La vigencia final debe ser igual o posterior a la inicial.", path: ["validUntil"] },
  );

export const updateRegulationSchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    jurisdiction: z.string().trim().min(1).max(100).optional(),
    countryId: z
      .union([z.string().uuid(), z.literal(""), z.null()])
      .optional()
      .transform((value) => (value === "" ? null : value)),
    version: z.string().trim().min(1).max(30).optional(),
    validFrom: dateSchema.optional(),
    validUntil: optionalDate,
    status: z.enum(["vigente", "derogada"]).optional(),
  })
  .refine(
    (input) => Object.values(input).some((v) => v !== undefined),
    "Debe indicar al menos un cambio.",
  );

export const listRegulationsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().optional(),
  status: z.enum(["vigente", "derogada"]).optional(),
  countryId: z.string().uuid().optional(),
});

// ── Requisitos ───────────────────────────────────────────────────────────────

export const createRequirementSchema = z
  .object({
    code: z.string().trim().min(1, "El código es obligatorio.").max(50),
    description: z.string().trim().min(1, "La descripción es obligatoria."),
    criticality: z.enum(["baja", "media", "alta"]).default("media"),
    rootRequirementId: z
      .union([z.string().uuid(), z.literal(""), z.null()])
      .optional()
      .transform((value) => value || null),
    validFrom: dateSchema,
    validUntil: optionalDate,
  })
  .refine(
    (data) =>
      data.validUntil === null || data.validUntil >= data.validFrom,
    { message: "La vigencia final debe ser igual o posterior a la inicial.", path: ["validUntil"] },
  );

export const updateRequirementSchema = z
  .object({
    description: z.string().trim().min(1).optional(),
    criticality: z.enum(["baja", "media", "alta"]).optional(),
    validUntil: optionalDate,
    active: z.boolean().optional(),
  })
  .refine(
    (input) => Object.values(input).some((v) => v !== undefined),
    "Debe indicar al menos un cambio.",
  );

export const listRequirementsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().optional(),
  active: z
    .string()
    .optional()
    .transform((v) => (v === "true" ? true : v === "false" ? false : undefined)),
});

export const regulationIdSchema = z.string().uuid("La normativa no es válida.");
export const requirementIdSchema = z.string().uuid("El requisito no es válido.");

export type CreateRegulationInput = z.output<typeof createRegulationSchema>;
export type UpdateRegulationInput = z.output<typeof updateRegulationSchema>;
export type ListRegulationsQuery = z.output<typeof listRegulationsQuerySchema>;
export type CreateRequirementInput = z.output<typeof createRequirementSchema>;
export type UpdateRequirementInput = z.output<typeof updateRequirementSchema>;
export type ListRequirementsQuery = z.output<typeof listRequirementsQuerySchema>;
