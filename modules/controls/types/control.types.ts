import type {
  estado_activo,
  tipo_control,
} from "@/generated/prisma/client";

export interface ControlSummary {
  id: string;
  description: string;
  type: tipo_control;
  effectiveness: number;
  isKey: boolean;
  status: estado_activo;
  updatedAt: Date;
}

export interface ControlHistoryEntry {
  id: string;
  actor: { id: string; name: string } | null;
  date: Date;
  previous: {
    effectiveness: number;
    status: estado_activo;
    isKey: boolean;
  };
  current: {
    effectiveness: number;
    status: estado_activo;
    isKey: boolean;
  };
}

export interface RiskControlOverview {
  controls: ControlSummary[];
  residualLevel: number;
  appetiteThreshold: number;
  exceedsAppetite: boolean;
}
