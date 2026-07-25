import { z } from "zod";

import {
  blockedEvidenceExtensions,
  blockedEvidenceMimeTypes,
  evidenceEntityTypes,
} from "@/modules/shared/constants/evidence";

export const evidenceTargetSchema = z.object({
  entityType: z.enum(evidenceEntityTypes),
  entityId: z.string().uuid("La entidad no es válida."),
});

export const evidenceIdSchema = z.string().uuid("La evidencia no es válida.");

export const createLinkEvidenceSchema = evidenceTargetSchema.extend({
  name: z.string().trim().min(1, "El nombre es obligatorio.").max(255),
  referenceUrl: z.url("El enlace no es válido."),
});

const blockedExtensionPattern = new RegExp(
  `\\.(${blockedEvidenceExtensions.join("|")})$`,
  "i",
);

export const createFileEvidenceMetadataSchema = evidenceTargetSchema.extend({
  name: z
    .string()
    .trim()
    .min(1, "El archivo debe tener un nombre.")
    .max(255, "El nombre no puede superar 255 caracteres.")
    .refine(
      (name) => !blockedExtensionPattern.test(name),
      "El tipo de archivo no está permitido.",
    ),
  mimeType: z
    .string()
    .trim()
    .min(1, "No se pudo determinar el tipo del archivo.")
    .max(150)
    .transform((value) => value.toLowerCase())
    .refine(
      (mimeType) =>
        !blockedEvidenceMimeTypes.includes(
          mimeType as (typeof blockedEvidenceMimeTypes)[number],
        ),
      "El tipo de archivo no está permitido.",
    ),
  sizeBytes: z.coerce.number<number>().int().positive(),
});

export type EvidenceTarget = z.output<typeof evidenceTargetSchema>;
export type CreateLinkEvidenceInput = z.output<
  typeof createLinkEvidenceSchema
>;
export type CreateFileEvidenceMetadataInput = z.output<
  typeof createFileEvidenceMetadataSchema
>;
