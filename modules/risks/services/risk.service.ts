import type { Prisma, estado_riesgo } from "@/generated/prisma/client";
import { AppError } from "@/lib/app-error";
import { withAuditContext } from "@/lib/transaction";
import { AuthorizationService } from "@/modules/auth/services/authorization.service";
import type {
  AuthPermission,
  AuthPrincipal,
} from "@/modules/auth/types/auth.types";
import {
  RiskRepository,
  type RiskSummaryRecord,
} from "@/modules/risks/repositories/risk.repository";
import type {
  PaginatedRisks,
  RiskCalculationPreview,
  RiskCriticality,
  RiskOwnerOption,
  RiskSummary,
} from "@/modules/risks/types/risk.types";
import type {
  CreateRiskInput,
  ListRisksQuery,
  PreviewRiskInput,
  TransitionRiskInput,
  UpdateRiskInput,
} from "@/modules/risks/validators/risk.validator";

type RiskRecord = NonNullable<
  Awaited<ReturnType<RiskRepository["findById"]>>
>;

function mapRisk(record: RiskSummaryRecord): RiskSummary {
  const owner = record.usuarios_riesgos_propietario_idTousuarios;
  const approver = record.usuarios_riesgos_aceptado_porTousuarios;
  const hasAcceptance =
    record.justificacion_aceptacion !== null &&
    approver !== null &&
    record.aceptado_at !== null &&
    record.fecha_revision !== null;

  return {
    id: record.id,
    code: record.codigo,
    title: record.titulo,
    description: record.descripcion,
    causes: record.causas ?? "",
    consequences: record.consecuencias ?? "",
    affectedObjectives: record.objetivos_afectados ?? "",
    probability: record.probabilidad,
    impact: record.impacto,
    inherentLevel:
      record.nivel_inherente ?? record.probabilidad * record.impacto,
    residualLevel: record.nivel_residual.toNumber(),
    financialExposure: record.exposicion_financiera?.toNumber() ?? null,
    currency: record.moneda,
    status: record.estado,
    category: {
      id: record.categorias_riesgo.id,
      name: record.categorias_riesgo.nombre,
    },
    unit: {
      id: record.unidades_negocio.id,
      name: record.unidades_negocio.nombre,
    },
    owner: owner ? { id: owner.id, name: owner.nombre } : null,
    createdBy: {
      id: record.usuarios_riesgos_creado_porTousuarios.id,
      name: record.usuarios_riesgos_creado_porTousuarios.nombre,
    },
    acceptance: hasAcceptance
      ? {
          justification: record.justificacion_aceptacion!,
          approvedBy: {
            id: approver.id,
            name: approver.nombre,
          },
          approvedAt: record.aceptado_at!,
          reviewDate: record.fecha_revision!,
        }
      : null,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

function riskNotFound(): AppError {
  return new AppError("NOT_FOUND", "El riesgo no existe.", 404);
}

function getCriticality(level: number): RiskCriticality {
  if (level <= 4) return "low";
  if (level <= 9) return "moderate";
  if (level <= 16) return "high";
  return "critical";
}

function roundToTwoDecimals(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function hasAction(permission: AuthPermission, action: "read" | "create" | "update") {
  if (action === "read") return permission.canRead;
  if (action === "create") return permission.canCreate;
  return permission.canUpdate;
}

function buildScopeWhere(
  principal: AuthPrincipal,
  action: "read" | "create" | "update",
): Prisma.riesgosWhereInput {
  const permissions = principal.permissions.filter(
    (permission) =>
      permission.module === "riesgos" && hasAction(permission, action),
  );

  if (permissions.some(({ scope }) => scope === "global")) {
    return {};
  }

  const scopes: Prisma.riesgosWhereInput[] = [];

  if (
    permissions.some(({ scope }) => scope === "unidad") &&
    principal.unitIds.length > 0
  ) {
    scopes.push({ unidad_id: { in: principal.unitIds } });
  }

  if (permissions.some(({ scope }) => scope === "asignado")) {
    scopes.push({ propietario_id: principal.userId });
  }

  if (permissions.some(({ scope }) => scope === "propio")) {
    scopes.push({ creado_por: principal.userId });
  }

  if (scopes.length === 0) {
    throw new AppError(
      "FORBIDDEN",
      "No tienes permiso para realizar esta acción.",
      403,
    );
  }

  return { OR: scopes };
}

export class RiskService {
  constructor(
    private readonly repository = new RiskRepository(),
    private readonly authorization = new AuthorizationService(),
  ) {}

  async list(
    query: ListRisksQuery,
    principal: AuthPrincipal,
  ): Promise<PaginatedRisks> {
    const scopeWhere = buildScopeWhere(principal, "read");
    const result = await this.repository.list(query, scopeWhere);

    return {
      items: result.items.map(mapRisk),
      page: query.page,
      pageSize: query.pageSize,
      total: result.total,
      totalPages: Math.ceil(result.total / query.pageSize),
    };
  }

  async getById(
    riskId: string,
    principal: AuthPrincipal,
  ): Promise<RiskSummary> {
    const risk = await this.getAuthorizedRisk(riskId, principal, "read");

    return mapRisk(risk);
  }

  async listOwnerOptions(unitIds?: string[]): Promise<RiskOwnerOption[]> {
    const owners = await this.repository.listActiveOwners(unitIds);

    return owners.map((owner) => ({
      id: owner.id,
      name: owner.nombre,
      unitIds: owner.usuario_unidades.map(({ unidad_id }) => unidad_id),
    }));
  }

  async listAvailableTransitions(
    riskId: string,
    principal: AuthPrincipal,
  ): Promise<estado_riesgo[]> {
    const risk = await this.getAuthorizedRisk(riskId, principal, "update");
    const transitions = await this.repository.listTransitions(risk.estado);

    return transitions.map(({ destino }) => destino);
  }

  async previewCalculation(
    input: PreviewRiskInput,
    principal: AuthPrincipal,
  ): Promise<RiskCalculationPreview> {
    let existingRisk: RiskRecord | null = null;

    if (input.riskId) {
      existingRisk = await this.getAuthorizedRisk(
        input.riskId,
        principal,
        "update",
      );
      this.authorization.assertAllowed(
        principal,
        "riesgos",
        "update",
        {
          unitId: input.unitId,
          ownerId: existingRisk.creado_por,
          assigneeIds: existingRisk.propietario_id
            ? [existingRisk.propietario_id]
            : [],
        },
      );
    } else {
      this.authorization.assertAllowed(
        principal,
        "riesgos",
        "create",
        {
          unitId: input.unitId,
          ownerId: principal.userId,
          assigneeIds: [],
        },
      );
    }

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const [category, unit, unitAppetite, globalAppetite, controls] =
      await Promise.all([
        this.repository.findCategoryForCalculation(input.categoryId),
        this.repository.findActiveUnit(input.unitId),
        this.repository.findEffectiveUnitAppetite(
          input.categoryId,
          input.unitId,
          today,
        ),
        this.repository.findEffectiveGlobalAppetite(
          input.categoryId,
          today,
        ),
        input.riskId
          ? this.repository.listActiveControlEffectiveness(input.riskId)
          : Promise.resolve([]),
      ]);

    if (!category) {
      throw new AppError(
        "VALIDATION_ERROR",
        "La categoría no existe o está inactiva.",
        400,
      );
    }

    if (!unit) {
      throw new AppError(
        "VALIDATION_ERROR",
        "La unidad de negocio no existe o está inactiva.",
        400,
      );
    }

    const inherentLevel = input.probability * input.impact;
    const residualFactor = controls.reduce(
      (factor, control) =>
        factor * (1 - control.efectividad.toNumber() / 100),
      1,
    );
    const residualLevel = roundToTwoDecimals(
      inherentLevel * residualFactor,
    );
    const accumulatedEffectiveness = roundToTwoDecimals(
      (1 - residualFactor) * 100,
    );
    const appetiteThreshold =
      unitAppetite?.umbral.toNumber() ??
      globalAppetite?.umbral.toNumber() ??
      category.apetito_base.toNumber();
    const appetiteSource = unitAppetite
      ? "unit"
      : globalAppetite
        ? "global"
        : "category";

    return {
      inherentLevel,
      residualLevel,
      accumulatedEffectiveness,
      appetiteThreshold,
      appetiteSource,
      inherentCriticality: getCriticality(inherentLevel),
      residualCriticality: getCriticality(residualLevel),
      exceedsAppetite: residualLevel > appetiteThreshold,
    };
  }

  async create(
    input: CreateRiskInput,
    principal: AuthPrincipal,
  ): Promise<RiskSummary> {
    this.authorization.assertAllowed(
      principal,
      "riesgos",
      "create",
      {
        unitId: input.unitId,
        ownerId: principal.userId,
        assigneeIds: input.ownerId ? [input.ownerId] : [],
      },
    );
    await this.assertReferences(
      input.categoryId,
      input.unitId,
      input.ownerId,
    );

    const risk = await withAuditContext(
      principal.userId,
      async (transaction) => {
        const repository = new RiskRepository(transaction);
        const created = await repository.create({
          titulo: input.title,
          descripcion: input.description,
          causas: input.causes,
          consecuencias: input.consequences,
          objetivos_afectados: input.affectedObjectives,
          categoria_id: input.categoryId,
          unidad_id: input.unitId,
          propietario_id: input.ownerId,
          creado_por: principal.userId,
          probabilidad: input.probability,
          impacto: input.impact,
          exposicion_financiera: input.financialExposure,
          moneda: input.currency,
          estado: "identificado",
        });
        const completeRisk = await repository.findById(created.id);

        if (!completeRisk) {
          throw riskNotFound();
        }

        return completeRisk;
      },
    );

    return mapRisk(risk);
  }

  async update(
    riskId: string,
    input: UpdateRiskInput,
    principal: AuthPrincipal,
  ): Promise<RiskSummary> {
    const existing = await this.getAuthorizedRisk(
      riskId,
      principal,
      "update",
    );
    const unitId = input.unitId ?? existing.unidad_id;
    const ownerId =
      input.ownerId === undefined ? existing.propietario_id : input.ownerId;
    const financialExposure =
      input.financialExposure === undefined
        ? existing.exposicion_financiera?.toNumber() ?? null
        : input.financialExposure;
    const currency =
      input.currency === undefined ? existing.moneda : input.currency;

    if ((financialExposure === null) !== (currency === null)) {
      throw new AppError(
        "VALIDATION_ERROR",
        "La exposición financiera y la moneda deben informarse juntas.",
        400,
      );
    }

    if (existing.estado !== "identificado" && ownerId === null) {
      throw new AppError(
        "VALIDATION_ERROR",
        "El riesgo requiere propietario en su estado actual.",
        400,
      );
    }

    this.authorization.assertAllowed(
      principal,
      "riesgos",
      "update",
      {
        unitId,
        ownerId: existing.creado_por,
        assigneeIds: ownerId ? [ownerId] : [],
      },
    );
    await this.assertUpdatedReferences(input);

    const risk = await withAuditContext(
      principal.userId,
      async (transaction) => {
        const repository = new RiskRepository(transaction);
        await repository.update(riskId, {
          titulo: input.title,
          descripcion: input.description,
          causas: input.causes,
          consecuencias: input.consequences,
          objetivos_afectados: input.affectedObjectives,
          categoria_id: input.categoryId,
          unidad_id: input.unitId,
          propietario_id: input.ownerId,
          probabilidad: input.probability,
          impacto: input.impact,
          exposicion_financiera: input.financialExposure,
          moneda: input.currency,
        });
        const completeRisk = await repository.findById(riskId);

        if (!completeRisk) {
          throw riskNotFound();
        }

        return completeRisk;
      },
    );

    return mapRisk(risk);
  }

  async transition(
    riskId: string,
    input: TransitionRiskInput,
    principal: AuthPrincipal,
  ): Promise<RiskSummary> {
    const existing = await this.getAuthorizedRisk(
      riskId,
      principal,
      "update",
    );
    const transition = await this.repository.findTransition(
      existing.estado,
      input.destination,
    );

    if (!transition) {
      throw new AppError(
        "VALIDATION_ERROR",
        `La transición ${existing.estado} → ${input.destination} no está permitida.`,
        400,
      );
    }

    if (
      input.destination !== "identificado" &&
      existing.propietario_id === null
    ) {
      throw new AppError(
        "VALIDATION_ERROR",
        "Debes asignar un propietario antes de cambiar el estado.",
        400,
      );
    }

    const risk = await withAuditContext(
      principal.userId,
      async (transaction) => {
        const repository = new RiskRepository(transaction);

        return repository.update(riskId, {
          estado: input.destination,
          justificacion_aceptacion:
            input.destination === "aceptado"
              ? input.justification
              : undefined,
          aceptado_por:
            input.destination === "aceptado"
              ? principal.userId
              : undefined,
          aceptado_at:
            input.destination === "aceptado" ? new Date() : undefined,
          fecha_revision:
            input.destination === "aceptado"
              ? input.reviewDate
              : undefined,
        });
      },
    );

    return mapRisk(risk);
  }

  private async getAuthorizedRisk(
    riskId: string,
    principal: AuthPrincipal,
    action: "read" | "update",
  ): Promise<RiskRecord> {
    const risk = await this.repository.findById(riskId);

    if (!risk) {
      throw riskNotFound();
    }

    this.authorization.assertAllowed(
      principal,
      "riesgos",
      action,
      {
        unitId: risk.unidad_id,
        ownerId: risk.creado_por,
        assigneeIds: risk.propietario_id ? [risk.propietario_id] : [],
      },
    );

    return risk;
  }

  private async assertReferences(
    categoryId: string,
    unitId: string,
    ownerId: string | null,
  ): Promise<void> {
    const [category, unit, owner] = await Promise.all([
      this.repository.findActiveCategory(categoryId),
      this.repository.findActiveUnit(unitId),
      ownerId
        ? this.repository.findActiveUser(ownerId)
        : Promise.resolve(null),
    ]);

    if (!category) {
      throw new AppError(
        "VALIDATION_ERROR",
        "La categoría no existe o está inactiva.",
        400,
      );
    }

    if (!unit) {
      throw new AppError(
        "VALIDATION_ERROR",
        "La unidad de negocio no existe o está inactiva.",
        400,
      );
    }

    if (ownerId && !owner) {
      throw new AppError(
        "VALIDATION_ERROR",
        "El propietario no existe o está inactivo.",
        400,
      );
    }
  }

  private async assertUpdatedReferences(
    input: UpdateRiskInput,
  ): Promise<void> {
    const [category, unit, owner] = await Promise.all([
      input.categoryId
        ? this.repository.findActiveCategory(input.categoryId)
        : Promise.resolve({ id: "" }),
      input.unitId
        ? this.repository.findActiveUnit(input.unitId)
        : Promise.resolve({ id: "" }),
      input.ownerId
        ? this.repository.findActiveUser(input.ownerId)
        : Promise.resolve({ id: "" }),
    ]);

    if (input.categoryId && !category) {
      throw new AppError(
        "VALIDATION_ERROR",
        "La categoría no existe o está inactiva.",
        400,
      );
    }

    if (input.unitId && !unit) {
      throw new AppError(
        "VALIDATION_ERROR",
        "La unidad de negocio no existe o está inactiva.",
        400,
      );
    }

    if (input.ownerId && !owner) {
      throw new AppError(
        "VALIDATION_ERROR",
        "El propietario no existe o está inactivo.",
        400,
      );
    }
  }
}
