import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { TransactionClient } from "@/lib/transaction";
import type { ListAuditLogQuery } from "@/modules/audit-log/validators/audit-log.validator";

type AuditLogDatabaseClient = Pick<TransactionClient, "bitacora">;

export const auditLogSelect = {
  id: true,
  usuario_id: true,
  accion: true,
  entidad: true,
  entidad_id: true,
  resultado: true,
  detalles: true,
  ip: true,
  fecha: true,
  usuarios: { select: { id: true, nombre: true } },
} satisfies Prisma.bitacoraSelect;

export type AuditLogRecord = Prisma.bitacoraGetPayload<{
  select: typeof auditLogSelect;
}>;

export class AuditLogRepository {
  constructor(private readonly database: AuditLogDatabaseClient = prisma) {}

  async list(query: ListAuditLogQuery) {
    const where: Prisma.bitacoraWhereInput = {
      entidad: query.entity,
      accion: query.action,
      usuario_id: query.userId,
      ...(query.startDate || query.endDate
        ? {
            fecha: {
              gte: query.startDate,
              lte: query.endDate,
            },
          }
        : {}),
      ...(query.search
        ? {
            OR: [
              { entidad: { contains: query.search, mode: "insensitive" } },
              { accion: { contains: query.search, mode: "insensitive" } },
              { resultado: { contains: query.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [total, items] = await Promise.all([
      this.database.bitacora.count({ where }),
      this.database.bitacora.findMany({
        where,
        select: auditLogSelect,
        orderBy: { fecha: "desc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);

    return { items, total };
  }
}
