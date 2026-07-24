import type { estado_riesgo } from "@/generated/prisma/client";

export const riskStatuses = [
  "identificado",
  "en_evaluacion",
  "abierto",
  "en_tratamiento",
  "monitoreo",
  "aceptado",
  "cerrado",
  "cancelado",
] as const satisfies readonly estado_riesgo[];

export const riskStatusLabels: Record<estado_riesgo, string> = {
  identificado: "Identificado",
  en_evaluacion: "En evaluación",
  abierto: "Abierto",
  en_tratamiento: "En tratamiento",
  monitoreo: "Monitoreo",
  aceptado: "Aceptado",
  cerrado: "Cerrado",
  cancelado: "Cancelado",
};
