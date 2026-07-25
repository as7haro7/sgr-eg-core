import type { tipo_evidencia } from "@/generated/prisma/client";
import type { EvidenceEntityType } from "@/modules/shared/constants/evidence";

export interface EvidenceSummary {
  id: string;
  type: tipo_evidencia;
  entityType: EvidenceEntityType;
  name: string;
  mimeType: string | null;
  sizeBytes: string | null;
  referenceUrl: string;
  author: { id: string; name: string };
  createdAt: Date;
}
