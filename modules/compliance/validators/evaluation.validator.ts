import { z } from "zod";

import { evaluationResults } from "@/modules/compliance/constants/evaluation";
import {
  optionalQueryEnum,
  optionalQueryText,
  optionalQueryUuid,
  queryPageSchema,
  queryPageSizeSchema,
} from "@/modules/shared/validators/query.validator";

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "La fecha no es válida.")
  .transform((value) => new Date(`${value}T00:00:00.000Z`));

const optionalText = z
  .union([z.string().trim(), z.literal(""), z.null()])
  .optional()
  .transform((value) => value || null);

const optionalUuid = (message: string) =>
  z
    .union([z.string().uuid(message), z.literal(""), z.null()])
    .optional()
    .transform((value) => value || null);

const optionalDate = z
  .union([dateSchema, z.literal(""), z.null()])
  .optional()
  .transform((value) => value || null);

export const createEvaluationSchema = z
  .object({
    requirementId: z.string().uuid("El requisito no es válido."),
    unitId: z.string().uuid("La unidad no es válida."),
    periodStart: dateSchema,
    periodEnd: dateSchema,
    result: z.enum(evaluationResults),
    observations: optionalText,
    notApplicableJustification: optionalText,
    actionPlan: optionalText,
    planResponsibleId: optionalUuid(
      "El responsable del plan no es válido.",
    ),
    planDeadline: optionalDate,
  })
  .superRefine((input, context) => {
    if (input.periodEnd < input.periodStart) {
      context.addIssue({
        code: "custom",
        message: "El fin del periodo no puede ser anterior al inicio.",
        path: ["periodEnd"],
      });
    }

    if (
      input.result === "no_aplicable" &&
      !input.notApplicableJustification
    ) {
      context.addIssue({
        code: "custom",
        message: "La justificación es obligatoria para No aplicable.",
        path: ["notApplicableJustification"],
      });
    }

    if (input.result === "no_conforme") {
      if (!input.actionPlan) {
        context.addIssue({
          code: "custom",
          message: "El plan de acción es obligatorio.",
          path: ["actionPlan"],
        });
      }
      if (!input.planResponsibleId) {
        context.addIssue({
          code: "custom",
          message: "El responsable del plan es obligatorio.",
          path: ["planResponsibleId"],
        });
      }
      if (!input.planDeadline) {
        context.addIssue({
          code: "custom",
          message: "La fecha límite del plan es obligatoria.",
          path: ["planDeadline"],
        });
      }
    }
  });

export const listEvaluationsQuerySchema = z.object({
  page: queryPageSchema,
  pageSize: queryPageSizeSchema,
  search: optionalQueryText(),
  result: optionalQueryEnum(evaluationResults),
  unitId: optionalQueryUuid,
});

export const evaluationIdSchema = z
  .string()
  .uuid("La evaluación no es válida.");

export type CreateEvaluationFormInput = z.input<
  typeof createEvaluationSchema
>;
export type CreateEvaluationInput = z.output<
  typeof createEvaluationSchema
>;
export type ListEvaluationsQuery = z.output<
  typeof listEvaluationsQuerySchema
>;
