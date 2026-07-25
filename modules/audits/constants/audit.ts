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
