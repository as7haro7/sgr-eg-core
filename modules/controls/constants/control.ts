import type {
  estado_activo,
  tipo_control,
} from "@/generated/prisma/client";

export const controlTypes = [
  "preventivo",
  "detectivo",
  "correctivo",
] as const satisfies readonly tipo_control[];

export const controlStatuses = [
  "activo",
  "inactivo",
] as const satisfies readonly estado_activo[];

export const controlTypeLabels: Record<tipo_control, string> = {
  preventivo: "Preventivo",
  detectivo: "Detectivo",
  correctivo: "Correctivo",
};
