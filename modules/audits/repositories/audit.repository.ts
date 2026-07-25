import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { TransactionClient } from "@/lib/transaction";
import type { ListAuditsQuery } from "@/modules/audits/validators/audit.validator";

type AuditDatabaseClient = Pick<
  TransactionClient,
  "auditorias" | "unidades_negocio" | "usuarios"
>;

export const auditSummarySelect = {
  id: true,
  objetivo: true,
  alcance: true,
  fecha_inicio: true,
  fecha_fin: true,
  estado: true,
  created_at: true,
  updated_at: true,
  usuarios: { select: { id: true, nombre: true } },
  unidades_negocio: { select: { id: true, nombre: true } },
  auditoria_equipo: {
    select: {
      funcion: true,
      usuarios: { select: { id: true, nombre: true } },
    },
    orderBy: { usuarios: { nombre: "asc" } },
  },
  _count: { select: { hallazgos: { where: { deleted_at: null } } } },
} satisfies Prisma.auditoriasSelect;

export type AuditSummaryRecord = Prisma.auditoriasGetPayload<{
  select: typeof auditSummarySelect;
}>;

export class AuditRepository {
  constructor(private readonly database: AuditDatabaseClient = prisma) {}

  async list(
    query: ListAuditsQuery,
    scopeWhere: Prisma.auditoriasWhereInput,
  ) {
    const where: Prisma.auditoriasWhereInput = {
      deleted_at: null,
      estado: query.status,
      unidad_id: query.unitId,
      AND: [
        scopeWhere,
        query.search
          ? {
              OR: [
                {
                  objetivo: {
                    contains: query.search,
                    mode: "insensitive",
                  },
                },
                {
                  alcance: {
                    contains: query.search,
                    mode: "insensitive",
                  },
                },
              ],
            }
          : {},
      ],
    };
    const [total, items] = await Promise.all([
      this.database.auditorias.count({ where }),
      this.database.auditorias.findMany({
        where,
        select: auditSummarySelect,
        orderBy: [{ fecha_inicio: "desc" }, { id: "desc" }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);

    return { items, total };
  }

  findById(id: string) {
    return this.database.auditorias.findFirst({
      where: { id, deleted_at: null },
      select: {
        ...auditSummarySelect,
        responsable_id: true,
        unidad_id: true,
        auditoria_equipo: {
          select: {
            usuario_id: true,
            funcion: true,
            usuarios: { select: { id: true, nombre: true } },
          },
          orderBy: { usuarios: { nombre: "asc" } },
        },
      },
    });
  }

  create(data: Prisma.auditoriasCreateInput) {
    return this.database.auditorias.create({
      data,
      select: auditSummarySelect,
    });
  }

  listActiveUsers() {
    return this.database.usuarios.findMany({
      where: { estado: "activo", deleted_at: null },
      select: {
        id: true,
        nombre: true,
        usuario_unidades: { select: { unidad_id: true } },
      },
      orderBy: [{ nombre: "asc" }, { id: "asc" }],
    });
  }

  findActiveUsers(ids: string[]) {
    return this.database.usuarios.findMany({
      where: { id: { in: ids }, estado: "activo", deleted_at: null },
      select: { id: true },
    });
  }

  findActiveUnit(id: string) {
    return this.database.unidades_negocio.findFirst({
      where: { id, estado: "activo" },
      select: { id: true },
    });
  }
}
