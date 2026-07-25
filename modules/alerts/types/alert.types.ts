import type {
  estado_alerta,
  severidad_alerta,
} from "@/generated/prisma/client";

export interface AlertSummary {
  id: string;
  ruleCode: string;
  severity: severidad_alerta;
  riskId: string | null;
  controlId: string | null;
  planId: string | null;
  actionId: string | null;
  findingId: string | null;
  regulationId: string | null;
  requirementId: string | null;
  evaluationId: string | null;
  recipient: { id: string; name: string };
  message: string;
  status: estado_alerta;
  generatedAt: Date;
  attendedAt: Date | null;
}

export interface PaginatedAlerts {
  items: AlertSummary[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  unreadCount: number;
}
