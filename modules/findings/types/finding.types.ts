import type {
  estado_hallazgo,
  severidad_hallazgo,
} from "@/generated/prisma/client";

export interface FindingParty {
  id: string;
  name: string;
}

export interface FindingRiskOption {
  id: string;
  code: string;
  title: string;
}

export interface FindingSummary {
  id: string;
  auditId: string;
  severity: severidad_hallazgo;
  condition: string;
  recommendation: string;
  response: string | null;
  responsible: FindingParty | null;
  deadline: Date | null;
  responseDate: Date | null;
  status: estado_hallazgo;
  requiresClosingEvidence: boolean;
  closedBy: FindingParty | null;
  closedAt: Date | null;
  risk: FindingRiskOption | null;
  evidenceCount: number;
  createdAt: Date;
  updatedAt: Date;
}
