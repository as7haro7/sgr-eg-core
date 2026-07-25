import { z } from "zod";

import {
  controlStatuses,
  controlTypes,
} from "@/modules/controls/constants/control";

const controlFieldsSchema = z.object({
  description: z
    .string()
    .trim()
    .min(1, "La descripción es obligatoria.")
    .max(500),
  type: z.enum(controlTypes),
  effectiveness: z.coerce.number<number>().min(0).max(100),
  isKey: z.boolean(),
  status: z.enum(controlStatuses),
});

export const controlEditorSchema = controlFieldsSchema;
export const createControlSchema = controlFieldsSchema.omit({
  status: true,
});

export const updateControlSchema = controlFieldsSchema
  .partial()
  .refine(
    (input) => Object.values(input).some((value) => value !== undefined),
    "Debe indicar al menos un cambio.",
  );

export const controlIdSchema = z.string().uuid("El control no es válido.");

export type CreateControlInput = z.output<typeof createControlSchema>;
export type ControlEditorInput = z.output<typeof controlEditorSchema>;
export type UpdateControlInput = z.output<typeof updateControlSchema>;
