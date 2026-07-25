import type {
  estado_hallazgo,
  severidad_hallazgo,
} from "@/generated/prisma/client";

export const findingSeverities = [
  "baja",
  "media",
  "alta",
  "critica",
] as const satisfies readonly severidad_hallazgo[];

export const findingSeverityLabels: Record<severidad_hallazgo, string> = {
  baja: "Baja",
  media: "Media",
  alta: "Alta",
  critica: "Crítica",
};

export const findingStatusLabels: Record<estado_hallazgo, string> = {
  abierto: "Abierto",
  en_seguimiento: "En seguimiento",
  cerrado: "Cerrado",
};
