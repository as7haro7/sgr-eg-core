import { z } from "zod";
import { riskStatuses } from "@/modules/risks/constants/risk-status";
import {
  optionalQueryDate,
  optionalQueryEnum,
  optionalQueryUuid,
} from "@/modules/shared/validators/query.validator";

export const dashboardFilterSchema = z.object({
  unitId: optionalQueryUuid,
  countryId: optionalQueryUuid,
  categoryId: optionalQueryUuid,
  ownerId: optionalQueryUuid,
  status: optionalQueryEnum(riskStatuses),
  periodStart: optionalQueryDate(),
  periodEnd: optionalQueryDate(true),
}).refine(
  ({ periodStart, periodEnd }) =>
    !periodStart || !periodEnd || periodEnd >= periodStart,
  {
    message: "El fin del periodo no puede ser anterior al inicio.",
    path: ["periodEnd"],
  },
);

export type DashboardFilter = z.output<typeof dashboardFilterSchema>;
