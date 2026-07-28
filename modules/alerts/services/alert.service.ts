import type { Prisma } from "@/generated/prisma/client";
import { AppError } from "@/lib/app-error";
import { withAuditContext } from "@/lib/transaction";
import { AuthorizationService } from "@/modules/auth/services/authorization.service";
import type { AuthPrincipal } from "@/modules/auth/types/auth.types";
import {
  AlertRepository,
  type AlertSummaryRecord,
} from "@/modules/alerts/repositories/alert.repository";
import type {
  AlertSummary,
  PaginatedAlerts,
} from "@/modules/alerts/types/alert.types";
import type {
  AttendAlertInput,
  ListAlertsQuery,
} from "@/modules/alerts/validators/alert.validator";

function mapAlert(
  record: AlertSummaryRecord,
  canUpdate = false,
): AlertSummary {
  return {
    id: record.id,
    ruleCode: record.regla_codigo,
    severity: record.severidad,
    riskId: record.riesgo_id,
    controlId: record.control_id,
    planId: record.plan_id,
    actionId: record.accion_id,
    findingId: record.hallazgo_id,
    regulationId: record.normativa_id,
    requirementId: record.requisito_id,
    evaluationId: record.evaluacion_id,
    recipient: { id: record.usuarios.id, name: record.usuarios.nombre },
    message: record.mensaje,
    status: record.estado,
    generatedAt: record.generada_at,
    attendedAt: record.atendida_at,
    canUpdate,
    history: record.alerta_historial.map((entry) => ({
      id: entry.id,
      event: entry.evento,
      comment: entry.comentario,
      createdAt: entry.created_at,
      user: {
        id: entry.usuarios.id,
        name: entry.usuarios.nombre,
      },
    })),
  };
}

function allowsAlertAction(
  permission: AuthPrincipal["permissions"][number],
  action: "read" | "update",
) {
  return action === "read" ? permission.canRead : permission.canUpdate;
}

function buildAlertScopeWhere(
  principal: AuthPrincipal,
  action: "read" | "update",
): Prisma.alertasWhereInput {
  const permissions = principal.permissions.filter(
    (permission) =>
      permission.module === "alertas" &&
      allowsAlertAction(permission, action),
  );
  if (permissions.some(({ scope }) => scope === "global")) return {};

  const scopes: Prisma.alertasWhereInput[] = [];
  if (
    permissions.some(
      ({ scope }) => scope === "propio" || scope === "asignado",
    )
  ) {
    scopes.push({ destinatario_id: principal.userId });
  }
  if (
    permissions.some(({ scope }) => scope === "unidad") &&
    principal.unitIds.length > 0
  ) {
    const unitIds = principal.unitIds;
    scopes.push(
      { destinatario_id: principal.userId },
      { riesgos: { unidad_id: { in: unitIds } } },
      { controles: { riesgos: { unidad_id: { in: unitIds } } } },
      {
        planes_mitigacion: {
          riesgos: { unidad_id: { in: unitIds } },
        },
      },
      {
        acciones_mitigacion: {
          planes_mitigacion: {
            riesgos: { unidad_id: { in: unitIds } },
          },
        },
      },
      {
        hallazgos: {
          auditorias: { unidad_id: { in: unitIds } },
        },
      },
      {
        evaluaciones_cumplimiento: {
          unidad_id: { in: unitIds },
        },
      },
    );
  }
  if (scopes.length === 0) {
    throw new AppError(
      "FORBIDDEN",
      "No tienes permiso para consultar alertas.",
      403,
    );
  }
  return { OR: scopes };
}

function getAlertUnitId(record: AlertSummaryRecord): string | undefined {
  return (
    record.riesgos?.unidad_id ??
    record.controles?.riesgos.unidad_id ??
    record.planes_mitigacion?.riesgos.unidad_id ??
    record.acciones_mitigacion?.planes_mitigacion.riesgos.unidad_id ??
    record.hallazgos?.auditorias.unidad_id ??
    record.evaluaciones_cumplimiento?.unidad_id ??
    undefined
  );
}

export class AlertService {
  constructor(
    private readonly repository = new AlertRepository(),
    private readonly authorization = new AuthorizationService(),
  ) {}

  async list(
    query: ListAlertsQuery,
    principal: AuthPrincipal,
  ): Promise<PaginatedAlerts> {
    const readPermissions = principal.permissions.filter(
      ({ module, canRead }) =>
        module === "alertas" && canRead,
    );
    const result = await this.repository.list(
      query,
      buildAlertScopeWhere(principal, "read"),
    );

    return {
      items: result.items.map((alert) =>
        mapAlert(alert, this.canUpdate(alert, principal)),
      ),
      page: query.page,
      pageSize: query.pageSize,
      total: result.total,
      totalPages: Math.ceil(result.total / query.pageSize),
      unreadCount: result.unreadCount,
      viewScope: readPermissions.some(({ scope }) => scope === "global")
        ? "global"
        : readPermissions.some(({ scope }) => scope === "unidad")
          ? "unit"
          : "personal",
    };
  }

  async countUnread(principal: AuthPrincipal): Promise<number> {
    return this.repository.countUnread(
      buildAlertScopeWhere(principal, "read"),
    );
  }

  async attend(
    alertId: string,
    input: AttendAlertInput,
    principal: AuthPrincipal,
  ): Promise<AlertSummary> {
    const alert = await this.repository.findById(alertId);

    if (!alert) {
      throw new AppError("NOT_FOUND", "La alerta no existe.", 404);
    }
    this.assertCanUpdate(alert, principal);

    if (alert.estado === "atendida") {
      throw new AppError("CONFLICT", "La alerta ya fue atendida.", 409);
    }

    const updatedAlert = await withAuditContext(principal.userId, async (tx) => {
      const repo = new AlertRepository(tx);
      await repo.addHistoryRecord({
        alerta_id: alertId,
        usuario_id: principal.userId,
        evento: "atencion",
        comentario: input.comment,
      });
      const updated = await repo.updateStatus(alertId, "atendida");

      return updated;
    });

    return mapAlert(updatedAlert, true);
  }

  async reopen(
    alertId: string,
    input: AttendAlertInput,
    principal: AuthPrincipal,
  ): Promise<AlertSummary> {
    const alert = await this.repository.findById(alertId);

    if (!alert) {
      throw new AppError("NOT_FOUND", "La alerta no existe.", 404);
    }
    this.assertCanUpdate(alert, principal);

    if (alert.estado !== "atendida") {
      throw new AppError("CONFLICT", "La alerta no está en estado atendido.", 409);
    }

    const updatedAlert = await withAuditContext(principal.userId, async (tx) => {
      const repo = new AlertRepository(tx);
      await repo.addHistoryRecord({
        alerta_id: alertId,
        usuario_id: principal.userId,
        evento: "reapertura",
        comentario: input.comment,
      });
      const updated = await repo.updateStatus(alertId, "pendiente");

      return updated;
    });

    return mapAlert(updatedAlert, true);
  }

  private canUpdate(
    alert: AlertSummaryRecord,
    principal: AuthPrincipal,
  ): boolean {
    const unitId =
      getAlertUnitId(alert) ??
      (alert.destinatario_id === principal.userId
        ? principal.primaryUnitId ?? principal.unitIds[0]
        : undefined);
    return this.authorization.isAllowed(
      principal,
      "alertas",
      "update",
      {
        unitId,
        ownerId: alert.destinatario_id,
        assigneeIds: [alert.destinatario_id],
      },
    );
  }

  private assertCanUpdate(
    alert: AlertSummaryRecord,
    principal: AuthPrincipal,
  ): void {
    if (!this.canUpdate(alert, principal)) {
      throw new AppError(
        "FORBIDDEN",
        "No tienes permiso para atender esta alerta.",
        403,
      );
    }
  }
}
