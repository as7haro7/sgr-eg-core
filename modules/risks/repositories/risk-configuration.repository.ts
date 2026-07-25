import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { TransactionClient } from "@/lib/transaction";

type RiskConfigurationDatabaseClient = Pick<
  TransactionClient,
  | "apetitos_riesgo"
  | "bitacora"
  | "categorias_riesgo"
  | "unidades_negocio"
>;

export class RiskConfigurationRepository {
  constructor(
    private readonly database: RiskConfigurationDatabaseClient = prisma,
  ) {}

  listCategories() {
    return this.database.categorias_riesgo.findMany({
      select: {
        id: true,
        nombre: true,
        descripcion: true,
        apetito_base: true,
        estado: true,
      },
      orderBy: [{ nombre: "asc" }, { id: "asc" }],
    });
  }

  findCategoryById(categoryId: string) {
    return this.database.categorias_riesgo.findUnique({
      where: { id: categoryId },
      select: {
        id: true,
        nombre: true,
        descripcion: true,
        apetito_base: true,
        estado: true,
      },
    });
  }

  findCategoryByName(name: string) {
    return this.database.categorias_riesgo.findUnique({
      where: { nombre: name },
      select: { id: true },
    });
  }

  createCategory(data: Prisma.categorias_riesgoUncheckedCreateInput) {
    return this.database.categorias_riesgo.create({
      data,
      select: {
        id: true,
        nombre: true,
        descripcion: true,
        apetito_base: true,
        estado: true,
      },
    });
  }

  updateCategory(
    categoryId: string,
    data: Prisma.categorias_riesgoUncheckedUpdateInput,
  ) {
    return this.database.categorias_riesgo.update({
      where: { id: categoryId },
      data,
      select: {
        id: true,
        nombre: true,
        descripcion: true,
        apetito_base: true,
        estado: true,
      },
    });
  }

  listAppetites() {
    return this.database.apetitos_riesgo.findMany({
      select: {
        id: true,
        umbral: true,
        vigente_desde: true,
        vigente_hasta: true,
        categorias_riesgo: {
          select: { id: true, nombre: true },
        },
        unidades_negocio: {
          select: { id: true, nombre: true },
        },
      },
      orderBy: [
        { vigente_desde: "desc" },
        { created_at: "desc" },
      ],
    });
  }

  findActiveUnitById(unitId: string) {
    return this.database.unidades_negocio.findFirst({
      where: { id: unitId, estado: "activo" },
      select: { id: true },
    });
  }

  findAppetiteByStartDate(
    categoryId: string,
    unitId: string | null,
    validFrom: Date,
  ) {
    return this.database.apetitos_riesgo.findFirst({
      where: {
        categoria_id: categoryId,
        unidad_id: unitId,
        vigente_desde: validFrom,
      },
      select: { id: true },
    });
  }

  findOverlappingAppetite(
    categoryId: string,
    unitId: string | null,
    validFrom: Date,
    validUntil: Date | null,
  ) {
    return this.database.apetitos_riesgo.findFirst({
      where: {
        categoria_id: categoryId,
        unidad_id: unitId,
        ...(validUntil
          ? { vigente_desde: { lte: validUntil } }
          : {}),
        OR: [
          { vigente_hasta: null },
          { vigente_hasta: { gte: validFrom } },
        ],
      },
      select: { id: true },
    });
  }

  createAppetite(data: Prisma.apetitos_riesgoUncheckedCreateInput) {
    return this.database.apetitos_riesgo.create({
      data,
      select: {
        id: true,
        umbral: true,
        vigente_desde: true,
        vigente_hasta: true,
        categorias_riesgo: {
          select: { id: true, nombre: true },
        },
        unidades_negocio: {
          select: { id: true, nombre: true },
        },
      },
    });
  }

  recordAudit(data: Prisma.bitacoraUncheckedCreateInput) {
    return this.database.bitacora.create({
      data,
      select: { id: true },
    });
  }
}
