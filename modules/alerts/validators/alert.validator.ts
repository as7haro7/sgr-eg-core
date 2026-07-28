import { z } from "zod";
import {
  optionalQueryEnum,
  queryPageSchema,
  queryPageSizeSchema,
} from "@/modules/shared/validators/query.validator";

export const listAlertsQuerySchema = z.object({
  page: queryPageSchema,
  pageSize: queryPageSizeSchema,
  status: optionalQueryEnum(["pendiente", "atendida", "descartada"]),
  severity: optionalQueryEnum(["media", "alta", "critica"]),
});

export const attendAlertSchema = z.object({
  comment: z.string().trim().min(1, "El comentario es obligatorio."),
});
export const patchAlertSchema = attendAlertSchema.extend({
  alertId: z.string().uuid("La alerta no es válida."),
});
export type PatchAlertInput = z.output<typeof patchAlertSchema>;

export const alertIdSchema = z.string().uuid("La alerta no es válida.");

export type ListAlertsQuery = z.output<typeof listAlertsQuerySchema>;
export type AttendAlertInput = z.output<typeof attendAlertSchema>;
