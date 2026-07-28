import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { TransactionClient } from "@/lib/transaction";
import type { ListEvaluationsQuery } from "@/modules/compliance/validators/evaluation.validator";

type EvaluationDatabaseClient = Pick<
  TransactionClient,
  | "evaluaciones_cumplimiento"
  | "requisitos"
  | "unidades_negocio"
  | "usuarios"
>;

export const evaluationSummarySelect = {
  id: true,
  requisito_id: true,
  unidad_id: true,
  periodo_inicio: true,
  periodo_fin: true,
  resultado: true,
  evaluador_id: true,
  observaciones: true,
  justificacion_no_aplicable: true,
  plan_accion: true,
  responsable_plan_id: true,
  fecha_limite_plan: true,
  created_at: true,
  updated_at: true,
  requisitos: {
    select: {
      id: true,
      codigo: true,
      descripcion: true,
      version: true,
      normativas: {
        select: {
          id: true,
          nombre: true,
          version: true,
          jurisdiccion: true,
        },
      },
    },
  },
  unidades_negocio: { select: { id: true, nombre: true } },
  usuarios_evaluaciones_cumplimiento_evaluador_idTousuarios: {
    select: { id: true, nombre: true },
  },
  usuarios_evaluaciones_cumplimiento_responsable_plan_idTousuarios: {
    select: { id: true, nombre: true },
  },
  _count: {
    select: { evidencias: { where: { deleted_at: null } } },
  },
} satisfies Prisma.evaluaciones_cumplimientoSelect;

export type EvaluationSummaryRecord =
  Prisma.evaluaciones_cumplimientoGetPayload<{
    select: typeof evaluationSummarySelect;
  }>;

export class EvaluationRepository {
  constructor(private readonly database: EvaluationDatabaseClient = prisma) {}

  async list(
    query: ListEvaluationsQuery,
    scopeWhere: Prisma.evaluaciones_cumplimientoWhereInput,
  ) {
    const where: Prisma.evaluaciones_cumplimientoWhereInput = {
      deleted_at: null,
      resultado: query.result,
      unidad_id: query.unitId,
      AND: [
        scopeWhere,
        query.search
          ? {
              OR: [
                {
                  requisitos: {
                    codigo: {
                      contains: query.search,
                      mode: "insensitive",
                    },
                  },
                },
                {
                  requisitos: {
                    descripcion: {
                      contains: query.search,
                      mode: "insensitive",
                    },
                  },
                },
                {
                  requisitos: {
                    normativas: {
                      nombre: {
                        contains: query.search,
                        mode: "insensitive",
                      },
                    },
                  },
                },
              ],
            }
          : {},
      ],
    };
    const [total, items] = await Promise.all([
      this.database.evaluaciones_cumplimiento.count({ where }),
      this.database.evaluaciones_cumplimiento.findMany({
        where,
        select: evaluationSummarySelect,
        orderBy: [
          { periodo_fin: "desc" },
          { created_at: "desc" },
          { id: "desc" },
        ],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);

    return { items, total };
  }

  findById(id: string) {
    return this.database.evaluaciones_cumplimiento.findFirst({
      where: { id, deleted_at: null },
      select: evaluationSummarySelect,
    });
  }

  findDuplicate(
    requirementId: string,
    unitId: string,
    periodStart: Date,
    periodEnd: Date,
    excludeId?: string,
  ) {
    return this.database.evaluaciones_cumplimiento.findFirst({
      where: {
        requisito_id: requirementId,
        unidad_id: unitId,
        periodo_inicio: periodStart,
        periodo_fin: periodEnd,
        deleted_at: null,
        id: excludeId ? { not: excludeId } : undefined,
      },
      select: { id: true },
    });
  }

  create(data: Prisma.evaluaciones_cumplimientoUncheckedCreateInput) {
    return this.database.evaluaciones_cumplimiento.create({
      data,
      select: evaluationSummarySelect,
    });
  }

  update(
    id: string,
    data: Prisma.evaluaciones_cumplimientoUncheckedUpdateInput,
  ) {
    return this.database.evaluaciones_cumplimiento.update({
      where: { id },
      data,
      select: evaluationSummarySelect,
    });
  }

  findActiveRequirement(id: string) {
    return this.database.requisitos.findFirst({
      where: {
        id,
        vigente: true,
        deleted_at: null,
        normativas: { estado: "vigente", deleted_at: null },
      },
      select: { id: true },
    });
  }

  listActiveRequirements() {
    return this.database.requisitos.findMany({
      where: {
        vigente: true,
        deleted_at: null,
        normativas: { estado: "vigente", deleted_at: null },
      },
      select: evaluationSummarySelect.requisitos.select,
      orderBy: [
        { normativas: { nombre: "asc" } },
        { codigo: "asc" },
        { version: "desc" },
      ],
    });
  }

  findActiveUnit(id: string) {
    return this.database.unidades_negocio.findFirst({
      where: { id, estado: "activo" },
      select: { id: true },
    });
  }

  listActiveUnits(ids?: string[]) {
    return this.database.unidades_negocio.findMany({
      where: {
        id: ids ? { in: ids } : undefined,
        estado: "activo",
      },
      select: { id: true, nombre: true, pais_id: true },
      orderBy: [{ nombre: "asc" }, { id: "asc" }],
    });
  }

  findActiveUser(id: string) {
    return this.database.usuarios.findFirst({
      where: { id, estado: "activo", deleted_at: null },
      select: { id: true },
    });
  }

  listActiveUsers() {
    return this.database.usuarios.findMany({
      where: { estado: "activo", deleted_at: null },
      select: { id: true, nombre: true },
      orderBy: [{ nombre: "asc" }, { id: "asc" }],
    });
  }
}
