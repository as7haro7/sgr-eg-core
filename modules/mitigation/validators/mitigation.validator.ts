import { z } from "zod";

import { mitigationStatuses } from "@/modules/mitigation/constants/mitigation";

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

const mitigationFieldsSchema = z.object({
  description: z
    .string()
    .trim()
    .min(1, "La descripción es obligatoria.")
    .max(500),
  responsibleId: z.string().uuid("El responsable no es válido."),
  dueDate: dateSchema,
  progress: z.coerce.number<number>().min(0).max(100),
  status: z.enum(mitigationStatuses),
});

export const mitigationEditorSchema = mitigationFieldsSchema;
export const createMitigationPlanSchema = mitigationFieldsSchema.omit({
  status: true,
});
export const updateMitigationPlanSchema = mitigationFieldsSchema
  .partial()
  .refine(
    (input) => Object.values(input).some((value) => value !== undefined),
    "Debe indicar al menos un cambio.",
  );
export const createMitigationActionSchema = mitigationFieldsSchema.omit({
  status: true,
});
export const updateMitigationActionSchema = mitigationFieldsSchema
  .partial()
  .refine(
    (input) => Object.values(input).some((value) => value !== undefined),
    "Debe indicar al menos un cambio.",
  );

export const mitigationPlanIdSchema = z
  .string()
  .uuid("El plan no es válido.");
export const mitigationActionIdSchema = z
  .string()
  .uuid("La acción no es válida.");

export type CreateMitigationPlanInput = z.output<
  typeof createMitigationPlanSchema
>;
export type CreateMitigationPlanFormInput = z.input<
  typeof createMitigationPlanSchema
>;
export type MitigationEditorFormInput = z.input<
  typeof mitigationEditorSchema
>;
export type MitigationEditorInput = z.output<
  typeof mitigationEditorSchema
>;
export type UpdateMitigationPlanInput = z.output<
  typeof updateMitigationPlanSchema
>;
export type CreateMitigationActionInput = z.output<
  typeof createMitigationActionSchema
>;
export type CreateMitigationActionFormInput = z.input<
  typeof createMitigationActionSchema
>;
export type UpdateMitigationActionInput = z.output<
  typeof updateMitigationActionSchema
>;
