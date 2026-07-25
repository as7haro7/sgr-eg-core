import type { estado_riesgo } from "@/generated/prisma/client";

export interface RiskParty {
  id: string;
  name: string;
}

export interface RiskSummary {
  id: string;
  code: string;
  title: string;
  description: string;
  causes: string;
  consequences: string;
  affectedObjectives: string;
  probability: number;
  impact: number;
  inherentLevel: number;
  residualLevel: number;
  financialExposure: number | null;
  currency: string | null;
  status: estado_riesgo;
  category: RiskParty;
  unit: RiskParty;
  owner: RiskParty | null;
  createdBy: RiskParty;
  acceptance: {
    justification: string;
    approvedBy: RiskParty;
    approvedAt: Date;
    reviewDate: Date;
  } | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaginatedRisks {
  items: RiskSummary[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface RiskOwnerOption {
  id: string;
  name: string;
  unitIds: string[];
}

export type RiskCriticality = "low" | "moderate" | "high" | "critical";
export type RiskAppetiteSource = "unit" | "global" | "category";

export interface RiskCalculationPreview {
  inherentLevel: number;
  residualLevel: number;
  accumulatedEffectiveness: number;
  appetiteThreshold: number;
  appetiteSource: RiskAppetiteSource;
  inherentCriticality: RiskCriticality;
  residualCriticality: RiskCriticality;
  exceedsAppetite: boolean;
}
