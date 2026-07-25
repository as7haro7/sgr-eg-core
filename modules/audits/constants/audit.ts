import type { estado_auditoria } from "@/generated/prisma/client";

export const auditStatuses = [
  "planificada",
  "en_ejecucion",
  "cerrada",
  "cancelada",
] as const satisfies readonly estado_auditoria[];

export const auditStatusLabels: Record<estado_auditoria, string> = {
  planificada: "Planificada",
  en_ejecucion: "En ejecución",
  cerrada: "Cerrada",
  cancelada: "Cancelada",
};

export const auditTransitions: Record<
  estado_auditoria,
  readonly estado_auditoria[]
> = {
  planificada: ["en_ejecucion", "cancelada"],
  en_ejecucion: ["cerrada", "cancelada"],
  cerrada: [],
  cancelada: [],
};
