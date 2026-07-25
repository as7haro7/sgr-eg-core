import { z } from "zod";
import {
  optionalQueryDate,
  optionalQueryText,
  optionalQueryUuid,
  queryPageSchema,
  queryPageSizeSchema,
} from "@/modules/shared/validators/query.validator";

export const listAuditLogQuerySchema = z
  .object({
    page: queryPageSchema,
    pageSize: queryPageSizeSchema,
    search: optionalQueryText(),
    entity: optionalQueryText(100),
    action: optionalQueryText(100),
    userId: optionalQueryUuid,
    startDate: optionalQueryDate(),
    endDate: optionalQueryDate(true),
  })
  .refine(
    ({ startDate, endDate }) =>
      !startDate || !endDate || endDate >= startDate,
    {
      message: "El fin del periodo no puede ser anterior al inicio.",
      path: ["endDate"],
    },
  );

export type ListAuditLogQuery = z.output<typeof listAuditLogQuerySchema>;
