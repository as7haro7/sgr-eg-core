import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { TransactionClient } from "@/lib/transaction";
import type { ListAlertsQuery } from "@/modules/alerts/validators/alert.validator";

type AlertDatabaseClient = Pick<
  TransactionClient,
  | "alertas"
  | "alerta_historial"
  | "riesgos"
  | "controles"
  | "planes_mitigacion"
  | "acciones_mitigacion"
  | "hallazgos"
  | "evaluaciones_cumplimiento"
  | "requisitos"
>;

export const alertSummarySelect = {
  id: true,
  regla_codigo: true,
  severidad: true,
  riesgo_id: true,
  control_id: true,
  plan_id: true,
  accion_id: true,
  hallazgo_id: true,
  normativa_id: true,
  requisito_id: true,
  evaluacion_id: true,
  destinatario_id: true,
  mensaje: true,
  estado: true,
  generada_at: true,
  atendida_at: true,
  usuarios: { select: { id: true, nombre: true } },
} satisfies Prisma.alertasSelect;

export type AlertSummaryRecord = Prisma.alertasGetPayload<{
  select: typeof alertSummarySelect;
}>;

export class AlertRepository {
  constructor(private readonly database: AlertDatabaseClient = prisma) {}

  async list(userId: string, query: ListAlertsQuery) {
    const where: Prisma.alertasWhereInput = {
      destinatario_id: userId,
      deleted_at: null,
      estado: query.status,
      severidad: query.severity,
    };

    const [total, unreadCount, items] = await Promise.all([
      this.database.alertas.count({ where }),
      this.database.alertas.count({
        where: { destinatario_id: userId, estado: "pendiente", deleted_at: null },
      }),
      this.database.alertas.findMany({
        where,
        select: alertSummarySelect,
        orderBy: [{ generada_at: "desc" }, { id: "desc" }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);

    return { items, total, unreadCount };
  }

  findById(id: string) {
    return this.database.alertas.findFirst({
      where: { id, deleted_at: null },
      select: alertSummarySelect,
    });
  }

  updateStatus(id: string, status: "atendida" | "pendiente") {
    return this.database.alertas.update({
      where: { id },
      data: {
        estado: status,
        atendida_at: status === "atendida" ? new Date() : null,
      },
      select: alertSummarySelect,
    });
  }

  addHistoryRecord(data: Prisma.alerta_historialUncheckedCreateInput) {
    return this.database.alerta_historial.create({
      data,
      select: { id: true },
    });
  }

  // ── Funciones para el Motor de Alertas ─────────────────────────────────────

  async createManyAlerts(data: Prisma.alertasUncheckedCreateInput[]) {
    if (data.length === 0) return 0;
    const result = await this.database.alertas.createMany({
      data,
      skipDuplicates: true,
    });
    return result.count;
  }

  // AL-01: Riesgos críticos no aceptados
  findCriticalUnacceptedRisks() {
    return this.database.riesgos.findMany({
      where: {
        nivel_residual: { gte: 20 }, // Umbral ejemplo de riesgo crítico
        estado: { not: "aceptado" },
        deleted_at: null,
        propietario_id: { not: null },
      },
      select: {
        id: true,
        propietario_id: true,
        codigo: true,
      },
    });
  }

  // AL-02: Revisiones de riesgo vencidas
  findOverdueRiskReviews(date: Date) {
    return this.database.riesgos.findMany({
      where: {
        fecha_revision: { lt: date },
        deleted_at: null,
        propietario_id: { not: null },
      },
      select: {
        id: true,
        propietario_id: true,
        codigo: true,
      },
    });
  }

  // AL-03: Controles inefectivos
  findIneffectiveControls() {
    return this.database.controles.findMany({
      where: {
        efectividad: { lt: 50 }, // Umbral ejemplo
        estado: "activo",
        deleted_at: null,
        riesgos: { propietario_id: { not: null } },
      },
      select: {
        id: true,
        riesgos: { select: { propietario_id: true, id: true, codigo: true } },
      },
    });
  }

  // AL-04: Planes de mitigación atrasados
  findOverdueMitigationPlans(date: Date) {
    return this.database.planes_mitigacion.findMany({
      where: {
        fecha_limite: { lt: date },
        estado: "activo",
        deleted_at: null,
      },
      select: {
        id: true,
        responsable_id: true,
        riesgo_id: true,
      },
    });
  }

  // AL-05: Acciones de mitigación atrasadas
  findOverdueMitigationActions(date: Date) {
    return this.database.acciones_mitigacion.findMany({
      where: {
        fecha_limite: { lt: date },
        estado: "activo",
        deleted_at: null,
      },
      select: {
        id: true,
        responsable_id: true,
        plan_id: true,
      },
    });
  }

  // AL-06: Hallazgos no cerrados
  findOverdueFindings(date: Date) {
    return this.database.hallazgos.findMany({
      where: {
        fecha_limite: { lt: date },
        estado: { not: "cerrado" },
        deleted_at: null,
        responsable_id: { not: null },
      },
      select: {
        id: true,
        responsable_id: true,
      },
    });
  }

  // AL-07: Evaluaciones de cumplimiento no conformes
  findNonCompliantEvaluations() {
    return this.database.evaluaciones_cumplimiento.findMany({
      where: {
        resultado: "no_conforme",
        deleted_at: null,
        responsable_plan_id: { not: null },
      },
      select: {
        id: true,
        responsable_plan_id: true,
        requisitos: { select: { id: true, normativa_id: true } },
      },
    });
  }
}
