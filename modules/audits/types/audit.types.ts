import type { estado_auditoria } from "@/generated/prisma/client";

export interface AuditParty {
  id: string;
  name: string;
}

export interface AuditTeamMember extends AuditParty {
  function: string | null;
}

export interface AuditSummary {
  id: string;
  objective: string;
  scope: string;
  startDate: Date;
  endDate: Date | null;
  status: estado_auditoria;
  responsible: AuditParty;
  unit: AuditParty | null;
  team: AuditTeamMember[];
  findingCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaginatedAudits {
  items: AuditSummary[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface AuditUserOption extends AuditParty {
  unitIds: string[];
}
