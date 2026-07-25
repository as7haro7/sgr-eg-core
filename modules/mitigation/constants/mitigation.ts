import type { estado_plan } from "@/generated/prisma/client";

export const mitigationStatuses = [
  "activo",
  "vencido",
  "completado",
  "cancelado",
] as const satisfies readonly estado_plan[];

export const mitigationStatusLabels: Record<estado_plan, string> = {
  activo: "Activo",
  vencido: "Vencido",
  completado: "Completado",
  cancelado: "Cancelado",
};
