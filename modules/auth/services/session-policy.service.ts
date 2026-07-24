import { z } from "zod";

import { AppError } from "@/lib/app-error";

const sessionDurationSchema = z.number().int().positive();

export function getSessionExpiration(
  parameterValue: unknown,
  issuedAt: Date,
): Date {
  const parsedDuration = sessionDurationSchema.safeParse(parameterValue);

  if (!parsedDuration.success) {
    throw new AppError(
      "INTERNAL_ERROR",
      "La política de sesión no está configurada correctamente.",
      500,
    );
  }

  return new Date(issuedAt.getTime() + parsedDuration.data * 60_000);
}
