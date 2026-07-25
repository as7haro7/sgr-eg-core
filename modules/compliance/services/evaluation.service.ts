import type { Prisma } from "@/generated/prisma/client";
import { AppError } from "@/lib/app-error";
import { withAuditContext } from "@/lib/transaction";
import { AuthorizationService } from "@/modules/auth/services/authorization.service";
import { scheduleAlertEvaluation } from "@/modules/alerts/services/alert-trigger.service";
import type {
  AuthPermission,
  AuthPrincipal,
} from "@/modules/auth/types/auth.types";
import {
  EvaluationRepository,
  type EvaluationSummaryRecord,
} from "@/modules/compliance/repositories/evaluation.repository";
import type {
  ComplianceParty,
  EvaluationSummary,
  EvaluationUnitOption,
  PaginatedEvaluations,
  RequirementOption,
} from "@/modules/compliance/types/evaluation.types";
import type {
  CreateEvaluationInput,
  ListEvaluationsQuery,
} from "@/modules/compliance/validators/evaluation.validator";

function mapRequirement(
  record: EvaluationSummaryRecord["requisitos"],
): RequirementOption {
  return {
    id: record.id,
    code: record.codigo,
    description: record.descripcion,
    version: record.version,
    regulation: {
      id: record.normativas.id,
      name: record.normativas.nombre,
      version: record.normativas.version,
      jurisdiction: record.normativas.jurisdiccion,
    },
  };
}

function mapEvaluation(
  record: EvaluationSummaryRecord,
): EvaluationSummary {
  const evaluator =
    record.usuarios_evaluaciones_cumplimiento_evaluador_idTousuarios;
  const planResponsible =
    record.usuarios_evaluaciones_cumplimiento_responsable_plan_idTousuarios;

  return {
    id: record.id,
    requirement: mapRequirement(record.requisitos),
    unit: {
      id: record.unidades_negocio.id,
      name: record.unidades_negocio.nombre,
    },
    periodStart: record.periodo_inicio,
    periodEnd: record.periodo_fin,
    result: record.resultado,
    evaluator: { id: evaluator.id, name: evaluator.nombre },
    observations: record.observaciones,
    notApplicableJustification: record.justificacion_no_aplicable,
    actionPlan: record.plan_accion,
    planResponsible: planResponsible
      ? { id: planResponsible.id, name: planResponsible.nombre }
      : null,
    planDeadline: record.fecha_limite_plan,
    evidenceCount: record._count.evidencias,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

function allowsAction(
  permission: AuthPermission,
  action: "read" | "create",
) {
  return action === "read" ? permission.canRead : permission.canCreate;
}

function buildScopeWhere(
  principal: AuthPrincipal,
  action: "read" | "create",
): Prisma.evaluaciones_cumplimientoWhereInput {
  const permissions = principal.permissions.filter(
    (permission) =>
      permission.module === "cumplimiento" &&
      allowsAction(permission, action),
  );

  if (permissions.some(({ scope }) => scope === "global")) return {};

  const scopes: Prisma.evaluaciones_cumplimientoWhereInput[] = [];

  if (
    permissions.some(({ scope }) => scope === "unidad") &&
    principal.unitIds.length > 0
  ) {
    scopes.push({ unidad_id: { in: principal.unitIds } });
  }
  if (permissions.some(({ scope }) => scope === "propio")) {
    scopes.push({ evaluador_id: principal.userId });
  }
  if (permissions.some(({ scope }) => scope === "asignado")) {
    scopes.push({
      OR: [
        { evaluador_id: principal.userId },
        { responsable_plan_id: principal.userId },
      ],
    });
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

export class EvaluationService {
  constructor(
    private readonly repository = new EvaluationRepository(),
    private readonly authorization = new AuthorizationService(),
  ) {}

  async list(
    query: ListEvaluationsQuery,
    principal: AuthPrincipal,
  ): Promise<PaginatedEvaluations> {
    const result = await this.repository.list(
      query,
      buildScopeWhere(principal, "read"),
    );

    return {
      items: result.items.map(mapEvaluation),
      page: query.page,
      pageSize: query.pageSize,
      total: result.total,
      totalPages: Math.ceil(result.total / query.pageSize),
    };
  }

  async getById(
    evaluationId: string,
    principal: AuthPrincipal,
  ): Promise<EvaluationSummary> {
    const evaluation = await this.repository.findById(evaluationId);
    if (!evaluation) {
      throw new AppError(
        "NOT_FOUND",
        "La evaluación no existe.",
        404,
      );
    }

    this.authorization.assertAllowed(
      principal,
      "cumplimiento",
      "read",
      {
        unitId: evaluation.unidad_id,
        ownerId: evaluation.evaluador_id,
        assigneeIds: [
          evaluation.evaluador_id,
          ...(evaluation.responsable_plan_id
            ? [evaluation.responsable_plan_id]
            : []),
        ],
      },
    );

    return mapEvaluation(evaluation);
  }

  async create(
    input: CreateEvaluationInput,
    principal: AuthPrincipal,
  ): Promise<EvaluationSummary> {
    this.authorization.assertAllowed(
      principal,
      "cumplimiento",
      "create",
      {
        unitId: input.unitId,
        ownerId: principal.userId,
        assigneeIds: [
          principal.userId,
          ...(input.planResponsibleId
            ? [input.planResponsibleId]
            : []),
        ],
      },
    );

    const [requirement, unit, planResponsible, duplicate] =
      await Promise.all([
        this.repository.findActiveRequirement(input.requirementId),
        this.repository.findActiveUnit(input.unitId),
        input.result === "no_conforme" && input.planResponsibleId
          ? this.repository.findActiveUser(input.planResponsibleId)
          : Promise.resolve({ id: "" }),
        this.repository.findDuplicate(
          input.requirementId,
          input.unitId,
          input.periodStart,
          input.periodEnd,
        ),
      ]);

    if (!requirement) {
      throw new AppError(
        "VALIDATION_ERROR",
        "El requisito no existe o no está vigente.",
        400,
      );
    }
    if (!unit) {
      throw new AppError(
        "VALIDATION_ERROR",
        "La unidad no existe o está inactiva.",
        400,
      );
    }
    if (
      input.result === "no_conforme" &&
      input.planResponsibleId &&
      !planResponsible
    ) {
      throw new AppError(
        "VALIDATION_ERROR",
        "El responsable del plan no existe o está inactivo.",
        400,
      );
    }
    if (duplicate) {
      throw new AppError(
        "CONFLICT",
        "Ya existe una evaluación para el mismo requisito, unidad y periodo.",
        409,
      );
    }

    const evaluation = await withAuditContext(
      principal.userId,
      (transaction) =>
        new EvaluationRepository(transaction).create({
          requisito_id: input.requirementId,
          unidad_id: input.unitId,
          periodo_inicio: input.periodStart,
          periodo_fin: input.periodEnd,
          resultado: input.result,
          evaluador_id: principal.userId,
          observaciones: input.observations,
          justificacion_no_aplicable:
            input.result === "no_aplicable"
              ? input.notApplicableJustification
              : null,
          plan_accion:
            input.result === "no_conforme" ? input.actionPlan : null,
          responsable_plan_id:
            input.result === "no_conforme"
              ? input.planResponsibleId
              : null,
          fecha_limite_plan:
            input.result === "no_conforme"
              ? input.planDeadline
              : null,
        }),
    );

    scheduleAlertEvaluation();
    return mapEvaluation(evaluation);
  }

  async listRequirementOptions(
    principal: AuthPrincipal,
  ): Promise<RequirementOption[]> {
    this.assertCanRead(principal);
    const requirements = await this.repository.listActiveRequirements();
    return requirements.map(mapRequirement);
  }

  async listUnitOptions(
    principal: AuthPrincipal,
  ): Promise<EvaluationUnitOption[]> {
    this.assertCanRead(principal);
    const hasGlobal = principal.permissions.some(
      (permission) =>
        permission.module === "cumplimiento" &&
        permission.canRead &&
        permission.scope === "global",
    );
    const units = await this.repository.listActiveUnits(
      hasGlobal ? undefined : principal.unitIds,
    );

    return units.map((unit) => ({
      id: unit.id,
      name: unit.nombre,
      countryId: unit.pais_id,
    }));
  }

  async listUserOptions(
    principal: AuthPrincipal,
  ): Promise<ComplianceParty[]> {
    this.assertCanRead(principal);
    return (await this.repository.listActiveUsers()).map((user) => ({
      id: user.id,
      name: user.nombre,
    }));
  }

  private assertCanRead(principal: AuthPrincipal) {
    if (
      !principal.permissions.some(
        (permission) =>
          permission.module === "cumplimiento" &&
          permission.canRead,
      )
    ) {
      throw new AppError(
        "FORBIDDEN",
        "No tienes permiso para consultar cumplimiento.",
        403,
      );
    }
  }
}
