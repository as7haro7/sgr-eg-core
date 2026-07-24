import { z } from "zod";

const jsonValueSchema = z.json();
const jsonTextSchema = z
  .string()
  .trim()
  .min(1, "El valor JSON es obligatorio.")
  .transform((value, context) => {
    try {
      return JSON.parse(value) as unknown;
    } catch {
      context.addIssue({
        code: "custom",
        message: "El valor debe ser JSON válido.",
      });

      return z.NEVER;
    }
  })
  .pipe(jsonValueSchema);

export const createSystemParameterSchema = z.object({
  key: z.string().trim().min(1, "La clave es obligatoria.").max(80),
  value: jsonValueSchema,
  description: z.string().trim().min(1, "La descripción es obligatoria."),
});

export const updateSystemParameterSchema = z
  .object({
    value: jsonValueSchema,
    description: z.string().trim().min(1, "La descripción es obligatoria."),
  })
  .partial()
  .refine(
    (input) => Object.values(input).some((value) => value !== undefined),
    "Debe indicar al menos un cambio.",
  );

export const createSystemParameterFormSchema = z
  .object({
    key: z.string().trim().min(1, "La clave es obligatoria.").max(80),
    valueText: jsonTextSchema,
    description: z.string().trim().min(1, "La descripción es obligatoria."),
  })
  .transform(({ description, key, valueText }) => ({
    key,
    value: valueText,
    description,
  }));

export const updateSystemParameterFormSchema = z
  .object({
    valueText: jsonTextSchema,
    description: z.string().trim().min(1, "La descripción es obligatoria."),
  })
  .transform(({ description, valueText }) => ({
    value: valueText,
    description,
  }));

export const systemParameterKeySchema = z
  .string()
  .trim()
  .min(1, "La clave es obligatoria.")
  .max(80);

export type CreateSystemParameterInput = z.infer<
  typeof createSystemParameterSchema
>;
export type UpdateSystemParameterInput = z.infer<
  typeof updateSystemParameterSchema
>;
export type CreateSystemParameterFormInput = z.input<
  typeof createSystemParameterFormSchema
>;
export type UpdateSystemParameterFormInput = z.input<
  typeof updateSystemParameterFormSchema
>;
