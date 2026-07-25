import type { resultado_evaluacion } from "@/generated/prisma/client";

export const evaluationResults = [
  "conforme",
  "parcialmente_conforme",
  "no_conforme",
  "no_aplicable",
] as const satisfies readonly resultado_evaluacion[];

export const evaluationResultLabels: Record<
  resultado_evaluacion,
  string
> = {
  conforme: "Conforme",
  parcialmente_conforme: "Parcialmente conforme",
  no_conforme: "No conforme",
  no_aplicable: "No aplicable",
};
