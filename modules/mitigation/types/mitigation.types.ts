import type { estado_plan } from "@/generated/prisma/client";

export interface MitigationAssignee {
  id: string;
  name: string;
}

export interface MitigationActionSummary {
  id: string;
  description: string;
  responsible: MitigationAssignee;
  dueDate: Date;
  progress: number;
  status: estado_plan;
  canUpdate: boolean;
  canDeactivate: boolean;
}

export interface MitigationPlanSummary {
  id: string;
  description: string;
  responsible: MitigationAssignee;
  dueDate: Date;
  progress: number;
  status: estado_plan;
  canUpdate: boolean;
  canDeactivate: boolean;
  canCreateActions: boolean;
  actions: MitigationActionSummary[];
}
