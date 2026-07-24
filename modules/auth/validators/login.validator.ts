import { z } from "zod";

export const loginSchema = z.object({
  correo: z
    .string()
    .trim()
    .email("El correo electrónico no es válido.")
    .transform((value) => value.toLowerCase()),
  password: z.string().min(1, "La contraseña es obligatoria."),
});

export type LoginFormInput = z.input<typeof loginSchema>;
export type LoginInput = z.output<typeof loginSchema>;
