import type { estado_normativa, criticidad_requisito } from "@/generated/prisma/client";

export interface RegulationSummary {
  id: string;
  name: string;
  jurisdiction: string;
  countryId: string | null;
  version: string;
  validFrom: Date;
  validUntil: Date | null;
  status: estado_normativa;
  requirementCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaginatedRegulations {
  items: RegulationSummary[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface RequirementSummary {
  id: string;
  regulationId: string;
  code: string;
  description: string;
  criticality: criticidad_requisito;
  version: number;
  rootRequirementId: string | null;
  validFrom: Date;
  validUntil: Date | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaginatedRequirements {
  items: RequirementSummary[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}
