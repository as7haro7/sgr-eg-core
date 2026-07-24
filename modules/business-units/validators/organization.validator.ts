import { z } from "zod";

const uppercaseCode = (length: number, label: string) =>
  z
    .string()
    .trim()
    .length(length, `${label} debe tener ${length} caracteres.`)
    .regex(/^[A-Za-z]+$/, `${label} solo admite letras.`)
    .transform((value) => value.toUpperCase());

export const createCountrySchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio.").max(100),
  isoCode: uppercaseCode(2, "El código ISO"),
});

export const updateCountrySchema = createCountrySchema
  .partial()
  .refine(
    (input) => Object.values(input).some((value) => value !== undefined),
    "Debe indicar al menos un cambio.",
  );

export const createBusinessUnitSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio.").max(150),
  countryId: z.string().uuid("El país no es válido."),
  currency: uppercaseCode(3, "La moneda"),
});

export const updateBusinessUnitSchema = createBusinessUnitSchema
  .partial()
  .refine(
    (input) => Object.values(input).some((value) => value !== undefined),
    "Debe indicar al menos un cambio.",
  );

export const countryIdSchema = z.string().uuid("El país no es válido.");
export const businessUnitIdSchema = z
  .string()
  .uuid("La unidad de negocio no es válida.");

export type CreateCountryInput = z.output<typeof createCountrySchema>;
export type CreateCountryFormInput = z.input<typeof createCountrySchema>;
export type UpdateCountryInput = z.output<typeof updateCountrySchema>;
export type CreateBusinessUnitFormInput = z.input<
  typeof createBusinessUnitSchema
>;
export type CreateBusinessUnitInput = z.output<
  typeof createBusinessUnitSchema
>;
export type UpdateBusinessUnitInput = z.output<
  typeof updateBusinessUnitSchema
>;
