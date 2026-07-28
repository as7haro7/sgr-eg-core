import { z } from "zod";

import { auditStatuses } from "@/modules/audits/constants/audit";
import {
  optionalQueryEnum,
  optionalQueryText,
  optionalQueryUuid,
  queryPageSchema,
  queryPageSizeSchema,
} from "@/modules/shared/validators/query.validator";

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "La fecha no es válida.")
  .transform((value) => new Date(`${value}T00:00:00.000Z`));

export const createAuditSchema = z
  .object({
    objective: z.string().trim().min(1, "El objetivo es obligatorio.").max(500),
    scope: z.string().trim().min(1, "El alcance es obligatorio."),
    startDate: dateSchema,
    endDate: z
      .union([dateSchema, z.literal(""), z.null()])
      .optional()
      .transform((value) => value || null),
    responsibleId: z.string().uuid("El responsable no es válido."),
    unitId: z
      .union([z.string().uuid("La unidad no es válida."), z.literal(""), z.null()])
      .optional()
      .transform((value) => value || null),
    teamMemberIds: z
      .array(z.string().uuid("Un miembro del equipo no es válido."))
      .default([]),
  })
  .refine(
    ({ endDate, startDate }) => !endDate || endDate >= startDate,
    {
      message: "La fecha final no puede ser anterior a la fecha inicial.",
      path: ["endDate"],
    },
  );
export const updateAuditSchema = createAuditSchema;

export const listAuditsQuerySchema = z.object({
  page: queryPageSchema,
  pageSize: queryPageSizeSchema,
  search: optionalQueryText(),
  status: optionalQueryEnum(auditStatuses),
  unitId: optionalQueryUuid,
});

export const auditIdSchema = z.string().uuid("La auditoría no es válida.");

export const transitionAuditSchema = z.object({
  destination: z.enum(auditStatuses),
});

export type CreateAuditFormInput = z.input<typeof createAuditSchema>;
export type CreateAuditInput = z.output<typeof createAuditSchema>;
export type UpdateAuditFormInput = z.input<typeof updateAuditSchema>;
export type UpdateAuditInput = z.output<typeof updateAuditSchema>;
export type ListAuditsQuery = z.output<typeof listAuditsQuerySchema>;
export type TransitionAuditInput = z.output<typeof transitionAuditSchema>;
