import { z } from "zod";

export const listAlertsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(["pendiente", "atendida", "descartada"]).optional(),
  severity: z.enum(["media", "alta", "critica"]).optional(),
});

export const attendAlertSchema = z.object({
  comment: z.string().trim().min(1, "El comentario es obligatorio."),
});

export const alertIdSchema = z.string().uuid("La alerta no es válida.");

export type ListAlertsQuery = z.output<typeof listAlertsQuerySchema>;
export type AttendAlertInput = z.output<typeof attendAlertSchema>;
