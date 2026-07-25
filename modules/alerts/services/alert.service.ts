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

function mapAlert(record: AlertSummaryRecord): AlertSummary {
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
  };
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
    const result = await this.repository.list(principal.userId, query);

    return {
      items: result.items.map(mapAlert),
      page: query.page,
      pageSize: query.pageSize,
      total: result.total,
      totalPages: Math.ceil(result.total / query.pageSize),
      unreadCount: result.unreadCount,
    };
  }

  async attend(
    alertId: string,
    input: AttendAlertInput,
    principal: AuthPrincipal,
  ): Promise<AlertSummary> {
    const alert = await this.repository.findById(alertId);

    if (!alert || alert.destinatario_id !== principal.userId) {
      throw new AppError("NOT_FOUND", "La alerta no existe o no te pertenece.", 404);
    }

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

    return mapAlert(updatedAlert);
  }

  async reopen(
    alertId: string,
    input: AttendAlertInput,
    principal: AuthPrincipal,
  ): Promise<AlertSummary> {
    const alert = await this.repository.findById(alertId);

    if (!alert || alert.destinatario_id !== principal.userId) {
      throw new AppError("NOT_FOUND", "La alerta no existe o no te pertenece.", 404);
    }

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

    return mapAlert(updatedAlert);
  }
}
