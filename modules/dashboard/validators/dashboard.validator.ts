import { z } from "zod";

export const dashboardFilterSchema = z.object({
  unitId: z.string().uuid().optional(),
  countryId: z.string().uuid().optional(),
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
});

export type DashboardFilter = z.output<typeof dashboardFilterSchema>;
