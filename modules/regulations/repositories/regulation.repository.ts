import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { TransactionClient } from "@/lib/transaction";
import type {
  ListRegulationsQuery,
  ListRequirementsQuery,
} from "@/modules/regulations/validators/regulation.validator";

type RegulationDatabaseClient = Pick<
  TransactionClient,
  "normativas" | "requisitos" | "paises" | "unidades_negocio"
>;

export const regulationSummarySelect = {
  id: true,
  nombre: true,
  jurisdiccion: true,
  pais_id: true,
  version: true,
  vigencia_inicio: true,
  vigencia_fin: true,
  estado: true,
  created_at: true,
  updated_at: true,
  _count: {
    select: { requisitos: { where: { deleted_at: null } } },
  },
} satisfies Prisma.normativasSelect;

export type RegulationSummaryRecord = Prisma.normativasGetPayload<{
  select: typeof regulationSummarySelect;
}>;

export const requirementSummarySelect = {
  id: true,
  normativa_id: true,
  codigo: true,
  descripcion: true,
  criticidad: true,
  version: true,
  requisito_raiz_id: true,
  vigencia_inicio: true,
  vigencia_fin: true,
  vigente: true,
  created_at: true,
  updated_at: true,
} satisfies Prisma.requisitosSelect;

export type RequirementSummaryRecord = Prisma.requisitosGetPayload<{
  select: typeof requirementSummarySelect;
}>;

export class RegulationRepository {
  constructor(private readonly database: RegulationDatabaseClient = prisma) {}

  async listRegulations(
    query: ListRegulationsQuery,
    allowedCountryIds?: string[],
  ) {
    const where: Prisma.normativasWhereInput = {
      deleted_at: null,
      estado: query.status,
      pais_id: query.countryId,
      ...(allowedCountryIds
        ? {
            AND: [
              {
                OR: [
                  { pais_id: null },
                  { pais_id: { in: allowedCountryIds } },
                ],
              },
            ],
          }
        : {}),
      ...(query.search
        ? {
            OR: [
              { nombre: { contains: query.search, mode: "insensitive" } },
              { jurisdiccion: { contains: query.search, mode: "insensitive" } },
              { version: { contains: query.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [total, items] = await Promise.all([
      this.database.normativas.count({ where }),
      this.database.normativas.findMany({
        where,
        select: regulationSummarySelect,
        orderBy: [{ nombre: "asc" }, { version: "desc" }, { id: "asc" }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);

    return { items, total };
  }

  findCountryIdsForUnits(unitIds: string[]) {
    return this.database.unidades_negocio.findMany({
      where: { id: { in: unitIds }, estado: "activo" },
      distinct: ["pais_id"],
      select: { pais_id: true },
    });
  }

  findRegulationById(id: string) {
    return this.database.normativas.findFirst({
      where: { id, deleted_at: null },
      select: regulationSummarySelect,
    });
  }

  findRegulationByUnique(name: string, jurisdiction: string, version: string) {
    return this.database.normativas.findFirst({
      where: { nombre: name, jurisdiccion: jurisdiction, version, deleted_at: null },
      select: { id: true },
    });
  }

  createRegulation(data: Prisma.normativasUncheckedCreateInput) {
    return this.database.normativas.create({
      data,
      select: regulationSummarySelect,
    });
  }

  updateRegulation(id: string, data: Prisma.normativasUncheckedUpdateInput) {
    return this.database.normativas.update({
      where: { id },
      data,
      select: regulationSummarySelect,
    });
  }

  // ── Requisitos ─────────────────────────────────────────────────────────────

  async listRequirements(regulationId: string, query: ListRequirementsQuery) {
    const where: Prisma.requisitosWhereInput = {
      normativa_id: regulationId,
      deleted_at: null,
      vigente: query.active,
      ...(query.search
        ? {
            OR: [
              { codigo: { contains: query.search, mode: "insensitive" } },
              { descripcion: { contains: query.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [total, items] = await Promise.all([
      this.database.requisitos.count({ where }),
      this.database.requisitos.findMany({
        where,
        select: requirementSummarySelect,
        orderBy: [{ codigo: "asc" }, { version: "desc" }, { id: "asc" }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);

    return { items, total };
  }

  findRequirementById(id: string) {
    return this.database.requisitos.findFirst({
      where: { id, deleted_at: null },
      select: requirementSummarySelect,
    });
  }

  findRequirementByCode(regulationId: string, code: string, version: number) {
    return this.database.requisitos.findFirst({
      where: { normativa_id: regulationId, codigo: code, version, deleted_at: null },
      select: { id: true },
    });
  }

  getLatestVersion(regulationId: string, rootId: string) {
    return this.database.requisitos.findFirst({
      where: {
        normativa_id: regulationId,
        deleted_at: null,
        OR: [{ id: rootId }, { requisito_raiz_id: rootId }],
      },
      select: { version: true },
      orderBy: { version: "desc" },
    });
  }

  createRequirement(data: Prisma.requisitosUncheckedCreateInput) {
    return this.database.requisitos.create({
      data,
      select: requirementSummarySelect,
    });
  }

  updateRequirement(id: string, data: Prisma.requisitosUncheckedUpdateInput) {
    return this.database.requisitos.update({
      where: { id },
      data,
      select: requirementSummarySelect,
    });
  }

  findActiveCountry(id: string) {
    return this.database.paises.findFirst({
      where: { id, estado: "activo" },
      select: { id: true },
    });
  }
}
