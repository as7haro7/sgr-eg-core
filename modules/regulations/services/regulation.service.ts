import { AppError } from "@/lib/app-error";
import { withAuditContext } from "@/lib/transaction";
import { AuthorizationService } from "@/modules/auth/services/authorization.service";
import type { AuthPrincipal } from "@/modules/auth/types/auth.types";
import {
  RegulationRepository,
  type RegulationSummaryRecord,
  type RequirementSummaryRecord,
} from "@/modules/regulations/repositories/regulation.repository";
import type {
  PaginatedRegulations,
  PaginatedRequirements,
  RegulationSummary,
  RequirementSummary,
} from "@/modules/regulations/types/regulation.types";
import type {
  CreateRegulationInput,
  CreateRequirementInput,
  ListRegulationsQuery,
  ListRequirementsQuery,
  UpdateRegulationInput,
  UpdateRequirementInput,
} from "@/modules/regulations/validators/regulation.validator";

function mapRegulation(record: RegulationSummaryRecord): RegulationSummary {
  return {
    id: record.id,
    name: record.nombre,
    jurisdiction: record.jurisdiccion,
    countryId: record.pais_id,
    version: record.version,
    validFrom: record.vigencia_inicio,
    validUntil: record.vigencia_fin,
    status: record.estado,
    requirementCount: record._count.requisitos,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

function mapRequirement(record: RequirementSummaryRecord): RequirementSummary {
  return {
    id: record.id,
    regulationId: record.normativa_id,
    code: record.codigo,
    description: record.descripcion,
    criticality: record.criticidad,
    version: record.version,
    rootRequirementId: record.requisito_raiz_id,
    validFrom: record.vigencia_inicio,
    validUntil: record.vigencia_fin,
    active: record.vigente,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

export class RegulationService {
  constructor(
    private readonly repository = new RegulationRepository(),
    private readonly authorization = new AuthorizationService(),
  ) {}

  // ── Normativas ─────────────────────────────────────────────────────────────

  async listRegulations(
    query: ListRegulationsQuery,
    principal: AuthPrincipal,
  ): Promise<PaginatedRegulations> {
    this.assertCanRead(principal);
    const result = await this.repository.listRegulations(query);

    return {
      items: result.items.map(mapRegulation),
      page: query.page,
      pageSize: query.pageSize,
      total: result.total,
      totalPages: Math.ceil(result.total / query.pageSize),
    };
  }

  async getRegulationById(
    regulationId: string,
    principal: AuthPrincipal,
  ): Promise<RegulationSummary> {
    this.assertCanRead(principal);
    const regulation = await this.repository.findRegulationById(regulationId);

    if (!regulation) {
      throw new AppError("NOT_FOUND", "La normativa no existe.", 404);
    }

    return mapRegulation(regulation);
  }

  async createRegulation(
    input: CreateRegulationInput,
    principal: AuthPrincipal,
  ): Promise<RegulationSummary> {
    this.authorization.assertAllowed(principal, "cumplimiento", "create");

    if (input.countryId) {
      const country = await this.repository.findActiveCountry(input.countryId);
      if (!country) {
        throw new AppError("VALIDATION_ERROR", "El país no existe o está inactivo.", 400);
      }
    }

    const duplicate = await this.repository.findRegulationByUnique(
      input.name,
      input.jurisdiction,
      input.version,
    );
    if (duplicate) {
      throw new AppError(
        "CONFLICT",
        "Ya existe una normativa con el mismo nombre, jurisdicción y versión.",
        409,
      );
    }

    const regulation = await withAuditContext(principal.userId, (tx) =>
      new RegulationRepository(tx).createRegulation({
        nombre: input.name,
        jurisdiccion: input.jurisdiction,
        pais_id: input.countryId,
        version: input.version,
        vigencia_inicio: input.validFrom,
        vigencia_fin: input.validUntil,
        estado: "vigente",
      }),
    );

    return mapRegulation(regulation);
  }

  async updateRegulation(
    regulationId: string,
    input: UpdateRegulationInput,
    principal: AuthPrincipal,
  ): Promise<RegulationSummary> {
    this.authorization.assertAllowed(principal, "cumplimiento", "update");
    const existing = await this.repository.findRegulationById(regulationId);

    if (!existing) {
      throw new AppError("NOT_FOUND", "La normativa no existe.", 404);
    }

    const regulation = await withAuditContext(principal.userId, (tx) =>
      new RegulationRepository(tx).updateRegulation(regulationId, {
        nombre: input.name,
        jurisdiccion: input.jurisdiction,
        pais_id: input.countryId,
        version: input.version,
        vigencia_inicio: input.validFrom,
        vigencia_fin: input.validUntil,
        estado: input.status,
      }),
    );

    return mapRegulation(regulation);
  }

  // ── Requisitos ─────────────────────────────────────────────────────────────

  async listRequirements(
    regulationId: string,
    query: ListRequirementsQuery,
    principal: AuthPrincipal,
  ): Promise<PaginatedRequirements> {
    this.assertCanRead(principal);
    await this.assertRegulationExists(regulationId);
    const result = await this.repository.listRequirements(regulationId, query);

    return {
      items: result.items.map(mapRequirement),
      page: query.page,
      pageSize: query.pageSize,
      total: result.total,
      totalPages: Math.ceil(result.total / query.pageSize),
    };
  }

  async getRequirementById(
    regulationId: string,
    requirementId: string,
    principal: AuthPrincipal,
  ): Promise<RequirementSummary> {
    this.assertCanRead(principal);
    await this.assertRegulationExists(regulationId);
    const requirement = await this.repository.findRequirementById(requirementId);

    if (!requirement || requirement.normativa_id !== regulationId) {
      throw new AppError("NOT_FOUND", "El requisito no existe.", 404);
    }

    return mapRequirement(requirement);
  }

  async createRequirement(
    regulationId: string,
    input: CreateRequirementInput,
    principal: AuthPrincipal,
  ): Promise<RequirementSummary> {
    this.authorization.assertAllowed(principal, "cumplimiento", "create");
    const regulation = await this.repository.findRegulationById(regulationId);

    if (!regulation) {
      throw new AppError("NOT_FOUND", "La normativa no existe.", 404);
    }

    if (regulation.estado !== "vigente") {
      throw new AppError(
        "CONFLICT",
        "No se pueden agregar requisitos a una normativa derogada.",
        409,
      );
    }

    // Determine version: if rootRequirementId provided → next version, else 1
    let version = 1;
    let rootId = input.rootRequirementId;

    if (rootId) {
      const latest = await this.repository.getLatestVersion(regulationId, rootId);
      version = latest ? latest.version + 1 : 1;
    }

    const duplicate = await this.repository.findRequirementByCode(
      regulationId,
      input.code,
      version,
    );
    if (duplicate) {
      throw new AppError(
        "CONFLICT",
        "Ya existe un requisito con ese código y versión en la normativa.",
        409,
      );
    }

    const requirement = await withAuditContext(principal.userId, (tx) =>
      new RegulationRepository(tx).createRequirement({
        normativa_id: regulationId,
        codigo: input.code,
        descripcion: input.description,
        criticidad: input.criticality,
        version,
        requisito_raiz_id: rootId,
        vigencia_inicio: input.validFrom,
        vigencia_fin: input.validUntil,
        vigente: true,
      }),
    );

    return mapRequirement(requirement);
  }

  async updateRequirement(
    regulationId: string,
    requirementId: string,
    input: UpdateRequirementInput,
    principal: AuthPrincipal,
  ): Promise<RequirementSummary> {
    this.authorization.assertAllowed(principal, "cumplimiento", "update");
    await this.assertRegulationExists(regulationId);
    const existing = await this.repository.findRequirementById(requirementId);

    if (!existing || existing.normativa_id !== regulationId) {
      throw new AppError("NOT_FOUND", "El requisito no existe.", 404);
    }

    const requirement = await withAuditContext(principal.userId, (tx) =>
      new RegulationRepository(tx).updateRequirement(requirementId, {
        descripcion: input.description,
        criticidad: input.criticality,
        vigencia_fin: input.validUntil,
        vigente: input.active,
      }),
    );

    return mapRequirement(requirement);
  }

  private assertCanRead(principal: AuthPrincipal): void {
    if (
      !principal.permissions.some(
        (p) => p.module === "cumplimiento" && p.canRead,
      )
    ) {
      throw new AppError(
        "FORBIDDEN",
        "No tienes permiso para consultar normativas.",
        403,
      );
    }
  }

  private async assertRegulationExists(regulationId: string): Promise<void> {
    const regulation = await this.repository.findRegulationById(regulationId);
    if (!regulation) {
      throw new AppError("NOT_FOUND", "La normativa no existe.", 404);
    }
  }
}
