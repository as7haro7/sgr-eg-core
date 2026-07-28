import type { Prisma, estado_riesgo } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { TransactionClient } from "@/lib/transaction";
import type { ListRisksQuery } from "@/modules/risks/validators/risk.validator";

type RiskDatabaseClient = Pick<
  TransactionClient,
  | "apetitos_riesgo"
  | "categorias_riesgo"
  | "controles"
  | "parametros_sistema"
  | "riesgos"
  | "transiciones_riesgo"
  | "unidades_negocio"
  | "usuarios"
>;

export const riskSummarySelect = {
  id: true,
  codigo: true,
  titulo: true,
  descripcion: true,
  causas: true,
  consecuencias: true,
  objetivos_afectados: true,
  probabilidad: true,
  impacto: true,
  nivel_inherente: true,
  nivel_residual: true,
  exposicion_financiera: true,
  moneda: true,
  estado: true,
  justificacion_aceptacion: true,
  aceptado_at: true,
  fecha_revision: true,
  created_at: true,
  updated_at: true,
  categorias_riesgo: {
    select: { id: true, nombre: true },
  },
  unidades_negocio: {
    select: { id: true, nombre: true },
  },
  usuarios_riesgos_propietario_idTousuarios: {
    select: { id: true, nombre: true },
  },
  usuarios_riesgos_creado_porTousuarios: {
    select: { id: true, nombre: true },
  },
  usuarios_riesgos_aceptado_porTousuarios: {
    select: { id: true, nombre: true },
  },
} satisfies Prisma.riesgosSelect;

export type RiskSummaryRecord = Prisma.riesgosGetPayload<{
  select: typeof riskSummarySelect;
}>;

export class RiskRepository {
  constructor(private readonly database: RiskDatabaseClient = prisma) {}

  findCriticalityRanges() {
    return this.database.parametros_sistema.findUnique({
      where: { clave: "criticidad_rangos" },
      select: { valor: true },
    });
  }

  async list(
    query: ListRisksQuery,
    scopeWhere: Prisma.riesgosWhereInput,
  ) {
    const where: Prisma.riesgosWhereInput = {
      deleted_at: null,
      estado: query.status,
      categoria_id: query.categoryId,
      unidad_id: query.unitId,
      propietario_id: query.ownerId,
      AND: [
        scopeWhere,
        query.search
          ? {
              OR: [
                {
                  codigo: {
                    contains: query.search,
                    mode: "insensitive",
                  },
                },
                {
                  titulo: {
                    contains: query.search,
                    mode: "insensitive",
                  },
                },
                {
                  descripcion: {
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
      this.database.riesgos.count({ where }),
      this.database.riesgos.findMany({
        where,
        select: riskSummarySelect,
        orderBy: [{ created_at: "desc" }, { id: "desc" }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);

    return { items, total };
  }

  findById(riskId: string) {
    return this.database.riesgos.findFirst({
      where: { id: riskId, deleted_at: null },
      select: {
        ...riskSummarySelect,
        unidad_id: true,
        propietario_id: true,
        creado_por: true,
      },
    });
  }

  findActiveCategory(categoryId: string) {
    return this.database.categorias_riesgo.findFirst({
      where: { id: categoryId, estado: "activo" },
      select: { id: true },
    });
  }

  findCategoryForCalculation(categoryId: string) {
    return this.database.categorias_riesgo.findFirst({
      where: { id: categoryId, estado: "activo" },
      select: { id: true, apetito_base: true },
    });
  }

  findEffectiveUnitAppetite(
    categoryId: string,
    unitId: string,
    date: Date,
  ) {
    return this.database.apetitos_riesgo.findFirst({
      where: {
        categoria_id: categoryId,
        unidad_id: unitId,
        vigente_desde: { lte: date },
        OR: [
          { vigente_hasta: null },
          { vigente_hasta: { gte: date } },
        ],
      },
      select: { umbral: true },
      orderBy: { vigente_desde: "desc" },
    });
  }

  findEffectiveGlobalAppetite(categoryId: string, date: Date) {
    return this.database.apetitos_riesgo.findFirst({
      where: {
        categoria_id: categoryId,
        unidad_id: null,
        vigente_desde: { lte: date },
        OR: [
          { vigente_hasta: null },
          { vigente_hasta: { gte: date } },
        ],
      },
      select: { umbral: true },
      orderBy: { vigente_desde: "desc" },
    });
  }

  listActiveControlEffectiveness(riskId: string) {
    return this.database.controles.findMany({
      where: {
        riesgo_id: riskId,
        estado: "activo",
        deleted_at: null,
      },
      select: { efectividad: true },
    });
  }

  findActiveUnit(unitId: string) {
    return this.database.unidades_negocio.findFirst({
      where: { id: unitId, estado: "activo" },
      select: { id: true },
    });
  }

  findActiveUser(userId: string) {
    return this.database.usuarios.findFirst({
      where: {
        id: userId,
        estado: "activo",
        deleted_at: null,
      },
      select: { id: true },
    });
  }

  hasActiveRole(userId: string, roleName: string) {
    return this.database.usuarios.findFirst({
      where: {
        id: userId,
        estado: "activo",
        deleted_at: null,
        usuario_roles: {
          some: {
            roles: {
              nombre: roleName,
              estado: "activo",
            },
          },
        },
      },
      select: { id: true },
    });
  }

  listActiveOwners(unitIds?: string[]) {
    return this.database.usuarios.findMany({
      where: {
        estado: "activo",
        deleted_at: null,
        usuario_unidades:
          unitIds && unitIds.length > 0
            ? { some: { unidad_id: { in: unitIds } } }
            : undefined,
      },
      select: {
        id: true,
        nombre: true,
        usuario_unidades: {
          select: { unidad_id: true },
        },
      },
      orderBy: [{ nombre: "asc" }, { id: "asc" }],
    });
  }

  findTransition(origin: estado_riesgo, destination: estado_riesgo) {
    return this.database.transiciones_riesgo.findUnique({
      where: {
        origen_destino: {
          origen: origin,
          destino: destination,
        },
      },
      select: { origen: true, destino: true },
    });
  }

  listTransitions(origin: estado_riesgo) {
    return this.database.transiciones_riesgo.findMany({
      where: { origen: origin },
      select: { destino: true },
      orderBy: { destino: "asc" },
    });
  }

  create(data: Prisma.riesgosUncheckedCreateInput) {
    return this.database.riesgos.create({
      data,
      select: riskSummarySelect,
    });
  }

  update(riskId: string, data: Prisma.riesgosUncheckedUpdateInput) {
    return this.database.riesgos.update({
      where: { id: riskId },
      data,
      select: riskSummarySelect,
    });
  }
}
