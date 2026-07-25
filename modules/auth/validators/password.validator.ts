import { z } from "zod";

export const securePasswordSchema = z
  .string()
  .min(12, "La contraseña debe tener al menos 12 caracteres.")
  .max(128, "La contraseña no puede superar 128 caracteres.")
  .regex(/[a-z]/, "La contraseña debe incluir una letra minúscula.")
  .regex(/[A-Z]/, "La contraseña debe incluir una letra mayúscula.")
  .regex(/\d/, "La contraseña debe incluir un número.");
