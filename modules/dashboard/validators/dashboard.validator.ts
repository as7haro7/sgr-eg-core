import { z } from "zod";
import { riskStatuses } from "@/modules/risks/constants/risk-status";

const optionalUuid = z
  .union([z.string().uuid(), z.literal(""), z.undefined()])
  .transform((value) => value || undefined);

export const dashboardFilterSchema = z.object({
  unitId: optionalUuid,
  countryId: optionalUuid,
  categoryId: optionalUuid,
  ownerId: optionalUuid,
  status: z
    .union([z.enum(riskStatuses), z.literal(""), z.undefined()])
    .transform((value) => value || undefined),
  periodStart: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .transform((v) => (v ? new Date(`${v}T00:00:00.000Z`) : undefined)),
  periodEnd: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .transform((v) => (v ? new Date(`${v}T23:59:59.999Z`) : undefined)),
}).refine(
  ({ periodStart, periodEnd }) =>
    !periodStart || !periodEnd || periodEnd >= periodStart,
  {
    message: "El fin del periodo no puede ser anterior al inicio.",
    path: ["periodEnd"],
  },
);

export type DashboardFilter = z.output<typeof dashboardFilterSchema>;
