import { AppError } from "@/lib/app-error";
import { withAuditContext } from "@/lib/transaction";
import { AuthorizationService } from "@/modules/auth/services/authorization.service";
import { scheduleAlertEvaluation } from "@/modules/alerts/services/alert-trigger.service";
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
    const allowedCountryIds = await this.getAllowedCountryIds(principal);
    const result = await this.repository.listRegulations(
      query,
      allowedCountryIds,
    );

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
    await this.assertCountryAllowed(principal, regulation.pais_id);

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
    await this.assertCountryAllowed(principal, input.countryId);

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

    scheduleAlertEvaluation();
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
    await this.assertCountryAllowed(
      principal,
      input.countryId === undefined ? existing.pais_id : input.countryId,
    );

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

    scheduleAlertEvaluation();
    return mapRegulation(regulation);
  }

  // ── Requisitos ─────────────────────────────────────────────────────────────

  async listRequirements(
    regulationId: string,
    query: ListRequirementsQuery,
    principal: AuthPrincipal,
  ): Promise<PaginatedRequirements> {
    this.assertCanRead(principal);
    await this.assertRegulationExists(regulationId, principal);
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
    await this.assertRegulationExists(regulationId, principal);
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
    await this.assertCountryAllowed(principal, regulation.pais_id);

    if (regulation.estado !== "vigente") {
      throw new AppError(
        "CONFLICT",
        "No se pueden agregar requisitos a una normativa derogada.",
        409,
      );
    }

    // Determine version: if rootRequirementId provided → next version, else 1
    let version = 1;
    let rootId: string | null = null;

    if (input.rootRequirementId) {
      const rootRequirement = await this.repository.findRequirementById(
        input.rootRequirementId,
      );
      if (
        !rootRequirement ||
        rootRequirement.normativa_id !== regulationId
      ) {
        throw new AppError(
          "VALIDATION_ERROR",
          "El requisito raíz no existe en esta normativa.",
          400,
        );
      }
      if (rootRequirement.codigo !== input.code) {
        throw new AppError(
          "VALIDATION_ERROR",
          "Una nueva versión debe conservar el código del requisito raíz.",
          400,
        );
      }
      rootId = rootRequirement.requisito_raiz_id ?? rootRequirement.id;
      const latest = await this.repository.getLatestVersion(regulationId, rootId);
      version = (latest?.version ?? rootRequirement.version) + 1;
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

    scheduleAlertEvaluation();
    return mapRequirement(requirement);
  }

  async updateRequirement(
    regulationId: string,
    requirementId: string,
    input: UpdateRequirementInput,
    principal: AuthPrincipal,
  ): Promise<RequirementSummary> {
    this.authorization.assertAllowed(principal, "cumplimiento", "update");
    await this.assertRegulationExists(regulationId, principal);
    const existing = await this.repository.findRequirementById(requirementId);

    if (!existing || existing.normativa_id !== regulationId) {
      throw new AppError("NOT_FOUND", "El requisito no existe.", 404);
    }

    const changesVersionedContent =
      (input.description !== undefined &&
        input.description !== existing.descripcion) ||
      (input.criticality !== undefined &&
        input.criticality !== existing.criticidad);

    const requirement = await withAuditContext(
      principal.userId,
      async (tx) => {
        const repository = new RegulationRepository(tx);
        if (!changesVersionedContent) {
          return repository.updateRequirement(requirementId, {
            vigencia_fin: input.validUntil,
            vigente: input.active,
          });
        }

        const rootId = existing.requisito_raiz_id ?? existing.id;
        const latest = await repository.getLatestVersion(
          regulationId,
          rootId,
        );
        const validFrom = new Date();
        validFrom.setUTCHours(0, 0, 0, 0);
        await repository.updateRequirement(existing.id, {
          vigente: false,
          vigencia_fin:
            existing.vigencia_fin && existing.vigencia_fin < validFrom
              ? existing.vigencia_fin
              : validFrom,
        });
        return repository.createRequirement({
          normativa_id: regulationId,
          codigo: existing.codigo,
          descripcion: input.description ?? existing.descripcion,
          criticidad: input.criticality ?? existing.criticidad,
          version: (latest?.version ?? existing.version) + 1,
          requisito_raiz_id: rootId,
          vigencia_inicio: validFrom,
          vigencia_fin: input.validUntil,
          vigente: input.active ?? true,
        });
      },
    );

    scheduleAlertEvaluation();
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

  private async assertRegulationExists(
    regulationId: string,
    principal: AuthPrincipal,
  ): Promise<void> {
    const regulation = await this.repository.findRegulationById(regulationId);
    if (!regulation) {
      throw new AppError("NOT_FOUND", "La normativa no existe.", 404);
    }
    await this.assertCountryAllowed(principal, regulation.pais_id);
  }

  private async getAllowedCountryIds(
    principal: AuthPrincipal,
  ): Promise<string[] | undefined> {
    const hasGlobal = principal.permissions.some(
      (permission) =>
        permission.module === "cumplimiento" &&
        permission.canRead &&
        permission.scope === "global",
    );
    if (hasGlobal) return undefined;
    const rows = await this.repository.findCountryIdsForUnits(
      principal.unitIds,
    );
    return rows.map(({ pais_id }) => pais_id);
  }

  private async assertCountryAllowed(
    principal: AuthPrincipal,
    countryId: string | null | undefined,
  ): Promise<void> {
    if (!countryId) return;
    const allowed = await this.getAllowedCountryIds(principal);
    if (allowed && !allowed.includes(countryId)) {
      throw new AppError(
        "FORBIDDEN",
        "La normativa está fuera del alcance de tus unidades.",
        403,
      );
    }
  }
}
