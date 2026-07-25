import { z } from "zod";

import { riskStatuses } from "@/modules/risks/constants/risk-status";

const requiredText = (label: string, max?: number) => {
  let schema = z.string().trim().min(1, `${label} es obligatorio.`);

  if (max) {
    schema = schema.max(max, `${label} no puede superar ${max} caracteres.`);
  }

  return schema;
};

const optionalOwnerId = z
  .union([z.string().uuid("El propietario no es válido."), z.literal(""), z.null()])
  .optional()
  .transform((value) => value || null);

const optionalCurrency = z
  .union([
    z
      .string()
      .trim()
      .regex(/^[A-Za-z]{3}$/, "La moneda debe tener tres letras.")
      .transform((value) => value.toUpperCase()),
    z.literal(""),
    z.null(),
  ])
  .optional()
  .transform((value) => value || null);

const optionalExposure = z
  .union([z.coerce.number<number>().nonnegative(), z.literal(""), z.null()])
  .optional()
  .transform((value) => value === "" || value === undefined ? null : value);

const riskFieldsSchema = z.object({
  title: requiredText("El título", 200),
  description: requiredText("La descripción"),
  causes: requiredText("Las causas"),
  consequences: requiredText("Las consecuencias"),
  affectedObjectives: requiredText("Los objetivos afectados"),
  categoryId: z.string().uuid("La categoría no es válida."),
  unitId: z.string().uuid("La unidad de negocio no es válida."),
  ownerId: optionalOwnerId,
  probability: z.coerce.number<number>().int().min(1).max(5),
  impact: z.coerce.number<number>().int().min(1).max(5),
  financialExposure: optionalExposure,
  currency: optionalCurrency,
});

function exposurePairIsValid(input: {
  financialExposure?: number | null;
  currency?: string | null;
}) {
  return (
    (input.financialExposure === null && input.currency === null) ||
    (input.financialExposure !== null &&
      input.financialExposure !== undefined &&
      input.currency !== null &&
      input.currency !== undefined)
  );
}

export const createRiskSchema = riskFieldsSchema.refine(exposurePairIsValid, {
  message: "La exposición financiera y la moneda deben informarse juntas.",
  path: ["financialExposure"],
});

export const updateRiskSchema = riskFieldsSchema
  .partial()
  .refine(
    (input) => Object.values(input).some((value) => value !== undefined),
    "Debe indicar al menos un cambio.",
  );

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

export const transitionRiskSchema = z
  .object({
    destination: z.enum(riskStatuses),
    justification: z.string().trim().optional(),
    reviewDate: dateSchema.nullable().optional(),
  })
  .superRefine(({ destination, justification, reviewDate }, context) => {
    if (destination !== "aceptado") {
      return;
    }

    if (!justification) {
      context.addIssue({
        code: "custom",
        message: "La justificación es obligatoria para aceptar el riesgo.",
        path: ["justification"],
      });
    }

    if (!reviewDate) {
      context.addIssue({
        code: "custom",
        message: "La fecha de revisión es obligatoria para aceptar el riesgo.",
        path: ["reviewDate"],
      });
    }
  });

export const listRisksQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().optional(),
  status: z.enum(riskStatuses).optional(),
  categoryId: z.string().uuid().optional(),
  unitId: z.string().uuid().optional(),
  ownerId: z.string().uuid().optional(),
});

export const riskIdSchema = z.string().uuid("El riesgo no es válido.");

export const previewRiskSchema = z.object({
  categoryId: z.string().uuid("La categoría no es válida."),
  unitId: z.string().uuid("La unidad de negocio no es válida."),
  probability: z.coerce.number<number>().int().min(1).max(5),
  impact: z.coerce.number<number>().int().min(1).max(5),
  riskId: riskIdSchema.optional(),
});

export type CreateRiskFormInput = z.input<typeof createRiskSchema>;
export type CreateRiskInput = z.output<typeof createRiskSchema>;
export type UpdateRiskInput = z.output<typeof updateRiskSchema>;
export type PreviewRiskInput = z.output<typeof previewRiskSchema>;
export type TransitionRiskFormInput = z.input<typeof transitionRiskSchema>;
export type TransitionRiskInput = z.output<typeof transitionRiskSchema>;
export type ListRisksQuery = z.output<typeof listRisksQuerySchema>;
