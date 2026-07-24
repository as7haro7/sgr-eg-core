import { z } from "zod";

const postgresUrlSchema = z.string().min(1).refine(
  (value) => {
    try {
      return ["postgres:", "postgresql:"].includes(new URL(value).protocol);
    } catch {
      return false;
    }
  },
  { message: "Debe ser una URL PostgreSQL válida." },
);

const serverEnvSchema = z.object({
  DATABASE_URL: postgresUrlSchema,
  DIRECT_URL: postgresUrlSchema,
});

const authEnvSchema = z.object({
  AUTH_JWT_SECRET: z
    .string()
    .min(32, "AUTH_JWT_SECRET debe tener al menos 32 caracteres."),
});

const parsedEnv = serverEnvSchema.safeParse({
  DATABASE_URL: process.env.DATABASE_URL,
  DIRECT_URL: process.env.DIRECT_URL,
});

if (!parsedEnv.success) {
  const invalidVariables = parsedEnv.error.issues
    .map((issue) => issue.path.join("."))
    .join(", ");

  throw new Error(
    `Configuración de entorno inválida: ${invalidVariables || "variables desconocidas"}.`,
  );
}

export const env = Object.freeze(parsedEnv.data);

export function getAuthEnv() {
  const parsedAuthEnv = authEnvSchema.safeParse({
    AUTH_JWT_SECRET: process.env.AUTH_JWT_SECRET,
  });

  if (!parsedAuthEnv.success) {
    throw new Error("AUTH_JWT_SECRET no está configurada correctamente.");
  }

  return Object.freeze(parsedAuthEnv.data);
}
