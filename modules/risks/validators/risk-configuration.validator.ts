import { z } from "zod";

const appetiteThresholdSchema = z.coerce
  .number<number>()
  .min(0, "El umbral no puede ser menor que 0.")
  .max(25, "El umbral no puede ser mayor que 25.");

const optionalDescriptionSchema = z
  .string()
  .trim()
  .transform((value) => value || null)
  .optional();

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

export const createRiskCategorySchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio.").max(100),
  description: optionalDescriptionSchema,
  baseAppetite: appetiteThresholdSchema,
});

export const updateRiskCategorySchema = z
  .object({
    name: z.string().trim().min(1, "El nombre es obligatorio.").max(100),
    description: optionalDescriptionSchema,
  })
  .partial()
  .refine(
    (input) => Object.values(input).some((value) => value !== undefined),
    "Debe indicar al menos un cambio.",
  );

export const createRiskAppetiteSchema = z
  .object({
    categoryId: z.string().uuid("La categoría no es válida."),
    unitId: z
      .union([
        z.string().uuid("La unidad de negocio no es válida."),
        z.literal(""),
        z.null(),
      ])
      .optional()
      .transform((value) => value || null),
    threshold: appetiteThresholdSchema,
    validFrom: dateSchema,
    validUntil: z
      .union([dateSchema, z.literal(""), z.null()])
      .optional()
      .transform((value) => value || null),
  })
  .refine(
    ({ validFrom, validUntil }) =>
      validUntil === null || validUntil >= validFrom,
    {
      message: "La fecha final no puede ser anterior a la fecha inicial.",
      path: ["validUntil"],
    },
  );

export const riskCategoryIdSchema = z
  .string()
  .uuid("La categoría no es válida.");

export type CreateRiskCategoryFormInput = z.input<
  typeof createRiskCategorySchema
>;
export type CreateRiskCategoryInput = z.output<
  typeof createRiskCategorySchema
>;
export type UpdateRiskCategoryInput = z.output<
  typeof updateRiskCategorySchema
>;
export type CreateRiskAppetiteFormInput = z.input<
  typeof createRiskAppetiteSchema
>;
export type CreateRiskAppetiteInput = z.output<
  typeof createRiskAppetiteSchema
>;
