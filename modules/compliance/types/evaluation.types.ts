import type { resultado_evaluacion } from "@/generated/prisma/client";

export interface ComplianceParty {
  id: string;
  name: string;
}

export interface RequirementOption {
  id: string;
  code: string;
  description: string;
  version: number;
  regulation: {
    id: string;
    name: string;
    version: string;
    jurisdiction: string;
  };
}

export interface EvaluationSummary {
  id: string;
  requirement: RequirementOption;
  unit: ComplianceParty;
  periodStart: Date;
  periodEnd: Date;
  result: resultado_evaluacion;
  evaluator: ComplianceParty;
  observations: string | null;
  notApplicableJustification: string | null;
  actionPlan: string | null;
  planResponsible: ComplianceParty | null;
  planDeadline: Date | null;
  evidenceCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface EvaluationUnitOption extends ComplianceParty {
  countryId: string;
}

export interface PaginatedEvaluations {
  items: EvaluationSummary[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}
