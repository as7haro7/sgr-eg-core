import { z } from "zod";

export const listAuditLogQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().optional(),
  entity: z.string().trim().optional(),
  action: z.string().trim().optional(),
  userId: z.string().uuid().optional(),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .transform((v) => (v ? new Date(`${v}T00:00:00.000Z`) : undefined)),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .transform((v) => (v ? new Date(`${v}T23:59:59.999Z`) : undefined)),
});

export type ListAuditLogQuery = z.output<typeof listAuditLogQuerySchema>;
