import { z } from "zod";

import { findingSeverities } from "@/modules/findings/constants/finding";

const nullableUuid = (message: string) =>
  z
    .union([z.string().uuid(message), z.literal(""), z.null()])
    .optional()
    .transform((value) => value || null);

const nullableDate = z
  .union([
    z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "La fecha límite no es válida.")
      .transform((value) => new Date(`${value}T00:00:00.000Z`)),
    z.literal(""),
    z.null(),
  ])
  .optional()
  .transform((value) => value || null);

const findingFieldsSchema = z
  .object({
    severity: z.enum(findingSeverities),
    condition: z
      .string()
      .trim()
      .min(1, "La condición encontrada es obligatoria."),
    recommendation: z
      .string()
      .trim()
      .min(1, "La recomendación es obligatoria."),
    riskId: nullableUuid("El riesgo relacionado no es válido."),
    responsibleId: nullableUuid("El responsable no es válido."),
    deadline: nullableDate,
    requiresClosingEvidence: z.boolean().default(true),
  });

export const createFindingSchema = findingFieldsSchema
  .superRefine(
    (
      {
        deadline,
        requiresClosingEvidence,
        responsibleId,
        severity,
      },
      context,
    ) => {
    if (severity === "critica" && !requiresClosingEvidence) {
      context.addIssue({
        code: "custom",
        message: "Los hallazgos críticos siempre requieren evidencia de cierre.",
        path: ["requiresClosingEvidence"],
      });
    }
    if (!responsibleId) {
      context.addIssue({
        code: "custom",
        message: "El responsable es obligatorio para el seguimiento.",
        path: ["responsibleId"],
      });
    }
    if (!deadline) {
      context.addIssue({
        code: "custom",
        message: "La fecha límite es obligatoria para el seguimiento.",
        path: ["deadline"],
      });
    }
  },
  );

export const respondFindingSchema = z.object({
  response: z
    .string()
    .trim()
    .min(1, "La respuesta es obligatoria."),
});

export const updateFindingSchema = findingFieldsSchema
  .partial()
  .refine(
    (input) => Object.values(input).some((value) => value !== undefined),
    "Debe indicar al menos un cambio.",
  );

export const auditFindingParamsSchema = z.object({
  auditId: z.string().uuid("La auditoría no es válida."),
});

export const findingParamsSchema = z.object({
  findingId: z.string().uuid("El hallazgo no es válido."),
});

export type CreateFindingFormInput = z.input<typeof createFindingSchema>;
export type CreateFindingInput = z.output<typeof createFindingSchema>;
export type UpdateFindingInput = z.output<typeof updateFindingSchema>;
export type RespondFindingInput = z.output<typeof respondFindingSchema>;
