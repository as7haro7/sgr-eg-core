import { z } from "zod";
import { securePasswordSchema } from "@/modules/auth/validators/password.validator";

export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, "La contraseña actual es obligatoria."),
    newPassword: securePasswordSchema,
    passwordConfirmation: z
      .string()
      .min(1, "La confirmación de contraseña es obligatoria."),
  })
  .refine(
    ({ newPassword, passwordConfirmation }) =>
      newPassword === passwordConfirmation,
    {
      message: "Las contraseñas no coinciden.",
      path: ["passwordConfirmation"],
    },
  );

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
