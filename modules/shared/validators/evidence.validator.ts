import { z } from "zod";

import { evidenceEntityTypes } from "@/modules/shared/constants/evidence";

export const evidenceTargetSchema = z.object({
  entityType: z.enum(evidenceEntityTypes),
  entityId: z.string().uuid("La entidad no es válida."),
});

export const createLinkEvidenceSchema = evidenceTargetSchema.extend({
  name: z.string().trim().min(1, "El nombre es obligatorio.").max(255),
  referenceUrl: z.url("El enlace no es válido."),
});

export type EvidenceTarget = z.output<typeof evidenceTargetSchema>;
export type CreateLinkEvidenceInput = z.output<
  typeof createLinkEvidenceSchema
>;
