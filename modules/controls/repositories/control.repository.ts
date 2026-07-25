import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { TransactionClient } from "@/lib/transaction";

type ControlDatabaseClient = Pick<
  TransactionClient,
  "apetitos_riesgo" | "bitacora" | "controles" | "riesgos"
>;

export const controlSelect = {
  id: true,
  descripcion: true,
  tipo: true,
  efectividad: true,
  es_clave: true,
  estado: true,
  updated_at: true,
} satisfies Prisma.controlesSelect;

export class ControlRepository {
  constructor(private readonly database: ControlDatabaseClient = prisma) {}

  findRiskContext(riskId: string) {
    return this.database.riesgos.findFirst({
      where: { id: riskId, deleted_at: null },
      select: {
        id: true,
        unidad_id: true,
        categoria_id: true,
        propietario_id: true,
        creado_por: true,
        nivel_residual: true,
        categorias_riesgo: {
          select: { apetito_base: true },
        },
      },
    });
  }

  listByRisk(riskId: string) {
    return this.database.controles.findMany({
      where: { riesgo_id: riskId, deleted_at: null },
      select: controlSelect,
      orderBy: [{ created_at: "asc" }, { id: "asc" }],
    });
  }

  findById(controlId: string) {
    return this.database.controles.findFirst({
      where: { id: controlId, deleted_at: null },
      select: {
        ...controlSelect,
        riesgo_id: true,
        riesgos: {
          select: {
            unidad_id: true,
            propietario_id: true,
            creado_por: true,
            deleted_at: true,
          },
        },
      },
    });
  }

  findEffectiveAppetites(
    categoryId: string,
    unitId: string,
    date: Date,
  ) {
    return this.database.apetitos_riesgo.findMany({
      where: {
        categoria_id: categoryId,
        unidad_id: { in: [unitId] },
        vigente_desde: { lte: date },
        OR: [
          { vigente_hasta: null },
          { vigente_hasta: { gte: date } },
        ],
      },
      select: {
        unidad_id: true,
        umbral: true,
        vigente_desde: true,
      },
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

  create(data: Prisma.controlesUncheckedCreateInput) {
    return this.database.controles.create({
      data,
      select: controlSelect,
    });
  }

  update(
    controlId: string,
    data: Prisma.controlesUncheckedUpdateInput,
  ) {
    return this.database.controles.update({
      where: { id: controlId },
      data,
      select: controlSelect,
    });
  }

  listHistory(controlId: string) {
    return this.database.bitacora.findMany({
      where: {
        entidad: "controles",
        entidad_id: controlId,
        accion: "update",
      },
      select: {
        id: true,
        fecha: true,
        detalles: true,
        usuarios: {
          select: { id: true, nombre: true },
        },
      },
      orderBy: [{ fecha: "desc" }, { id: "desc" }],
    });
  }
}
