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

  async list(
    query: ListAuditLogQuery,
    scope?: {
      unitIds?: string[];
      assignedUserId?: string;
      ownUserId?: string;
    },
  ) {
    const scopeFilters = await Promise.all([
      scope?.unitIds
        ? this.buildUnitScopeFilter(scope.unitIds)
        : Promise.resolve(undefined),
      scope?.assignedUserId
        ? this.buildAssignedScopeFilter(scope.assignedUserId)
        : Promise.resolve(undefined),
      scope?.ownUserId
        ? Promise.resolve<Prisma.bitacoraWhereInput>({
            usuario_id: scope.ownUserId,
          })
        : Promise.resolve(undefined),
    ]);
    const activeScopeFilters = scopeFilters.filter(
      (filter): filter is Prisma.bitacoraWhereInput => Boolean(filter),
    );
    const scopeFilter: Prisma.bitacoraWhereInput | undefined =
      scope && activeScopeFilters.length > 0
        ? { OR: activeScopeFilters }
        : scope
          ? { id: { equals: BigInt(-1) } }
          : undefined;
    const searchFilter: Prisma.bitacoraWhereInput | undefined = query.search
      ? {
          OR: [
            { entidad: { contains: query.search, mode: "insensitive" } },
            { accion: { contains: query.search, mode: "insensitive" } },
            { resultado: { contains: query.search, mode: "insensitive" } },
          ],
        }
      : undefined;
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
      AND: [searchFilter, scopeFilter].filter(
        (filter): filter is Prisma.bitacoraWhereInput => Boolean(filter),
      ),
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

  private async buildUnitScopeFilter(
    unitIds: string[],
  ): Promise<Prisma.bitacoraWhereInput> {
    if (unitIds.length === 0) {
      return { id: { equals: BigInt(-1) } };
    }

    const [risks, controls, plans, actions, audits, findings, evaluations] =
      await Promise.all([
        prisma.riesgos.findMany({
          where: { unidad_id: { in: unitIds } },
          select: { id: true },
        }),
        prisma.controles.findMany({
          where: { riesgos: { unidad_id: { in: unitIds } } },
          select: { id: true },
        }),
        prisma.planes_mitigacion.findMany({
          where: { riesgos: { unidad_id: { in: unitIds } } },
          select: { id: true },
        }),
        prisma.acciones_mitigacion.findMany({
          where: {
            planes_mitigacion: {
              riesgos: { unidad_id: { in: unitIds } },
            },
          },
          select: { id: true },
        }),
        prisma.auditorias.findMany({
          where: { unidad_id: { in: unitIds } },
          select: { id: true },
        }),
        prisma.hallazgos.findMany({
          where: { auditorias: { unidad_id: { in: unitIds } } },
          select: { id: true },
        }),
        prisma.evaluaciones_cumplimiento.findMany({
          where: { unidad_id: { in: unitIds } },
          select: { id: true },
        }),
      ]);

    const idsByEntity = [
      ["riesgos", risks],
      ["controles", controls],
      ["planes_mitigacion", plans],
      ["acciones_mitigacion", actions],
      ["auditorias", audits],
      ["hallazgos", findings],
      ["evaluaciones_cumplimiento", evaluations],
    ] as const;

    return {
      OR: idsByEntity.map(([entidad, rows]) => ({
        entidad,
        entidad_id: { in: rows.map(({ id }) => id) },
      })),
    };
  }

  private async buildAssignedScopeFilter(
    userId: string,
  ): Promise<Prisma.bitacoraWhereInput> {
    const [risks, controls, plans, actions, audits, findings, evaluations] =
      await Promise.all([
        prisma.riesgos.findMany({
          where: {
            OR: [{ propietario_id: userId }, { creado_por: userId }],
          },
          select: { id: true },
        }),
        prisma.controles.findMany({
          where: {
            riesgos: {
              OR: [{ propietario_id: userId }, { creado_por: userId }],
            },
          },
          select: { id: true },
        }),
        prisma.planes_mitigacion.findMany({
          where: {
            OR: [
              { responsable_id: userId },
              {
                riesgos: {
                  OR: [{ propietario_id: userId }, { creado_por: userId }],
                },
              },
            ],
          },
          select: { id: true },
        }),
        prisma.acciones_mitigacion.findMany({
          where: {
            OR: [
              { responsable_id: userId },
              { planes_mitigacion: { responsable_id: userId } },
              {
                planes_mitigacion: {
                  riesgos: {
                    OR: [{ propietario_id: userId }, { creado_por: userId }],
                  },
                },
              },
            ],
          },
          select: { id: true },
        }),
        prisma.auditorias.findMany({
          where: {
            OR: [
              { responsable_id: userId },
              { auditoria_equipo: { some: { usuario_id: userId } } },
            ],
          },
          select: { id: true },
        }),
        prisma.hallazgos.findMany({
          where: {
            OR: [
              { responsable_id: userId },
              { auditorias: { responsable_id: userId } },
              {
                auditorias: {
                  auditoria_equipo: { some: { usuario_id: userId } },
                },
              },
            ],
          },
          select: { id: true },
        }),
        prisma.evaluaciones_cumplimiento.findMany({
          where: {
            OR: [
              { evaluador_id: userId },
              { responsable_plan_id: userId },
            ],
          },
          select: { id: true },
        }),
      ]);

    const idsByEntity = [
      ["riesgos", risks],
      ["controles", controls],
      ["planes_mitigacion", plans],
      ["acciones_mitigacion", actions],
      ["auditorias", audits],
      ["hallazgos", findings],
      ["evaluaciones_cumplimiento", evaluations],
    ] as const;

    return {
      OR: idsByEntity.map(([entidad, rows]) => ({
        entidad,
        entidad_id: { in: rows.map(({ id }) => id) },
      })),
    };
  }
}
