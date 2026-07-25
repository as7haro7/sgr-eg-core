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

const evidenceStorageEnvSchema = z.object({
  SUPABASE_URL: z.url("SUPABASE_URL debe ser una URL válida."),
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(1, "SUPABASE_SERVICE_ROLE_KEY es obligatoria."),
  SUPABASE_EVIDENCE_BUCKET: z
    .string()
    .trim()
    .min(1)
    .regex(
      /^[a-z0-9][a-z0-9._-]*$/,
      "SUPABASE_EVIDENCE_BUCKET no es válido.",
    ),
});

const emailEnvSchema = z.object({
  SMTP_HOST: z.string().trim().min(1),
  SMTP_PORT: z.coerce.number().int().positive(),
  SMTP_USER: z.string().trim().min(1),
  SMTP_PASSWORD: z.string().min(1),
  SMTP_FROM: z.email(),
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

export function isEvidenceStorageConfigured(): boolean {
  return evidenceStorageEnvSchema.safeParse({
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_EVIDENCE_BUCKET: process.env.SUPABASE_EVIDENCE_BUCKET,
  }).success;
}

export function getEvidenceStorageEnv() {
  const parsedStorageEnv = evidenceStorageEnvSchema.safeParse({
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_EVIDENCE_BUCKET: process.env.SUPABASE_EVIDENCE_BUCKET,
  });

  if (!parsedStorageEnv.success) {
    throw new Error(
      "El almacenamiento de evidencias no está configurado correctamente.",
    );
  }

  return Object.freeze(parsedStorageEnv.data);
}

export function getEmailEnv() {
  const parsed = emailEnvSchema.safeParse({
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_PORT: process.env.SMTP_PORT,
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASSWORD: process.env.SMTP_PASSWORD,
    SMTP_FROM: process.env.SMTP_FROM,
  });
  return parsed.success ? Object.freeze(parsed.data) : null;
}
