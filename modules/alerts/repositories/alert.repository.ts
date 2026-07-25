import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { TransactionClient } from "@/lib/transaction";
import type { ListAlertsQuery } from "@/modules/alerts/validators/alert.validator";

type AlertDatabaseClient = Pick<
  TransactionClient,
  | "acciones_mitigacion"
  | "alerta_historial"
  | "alertas"
  | "apetitos_riesgo"
  | "bitacora"
  | "controles"
  | "evaluaciones_cumplimiento"
  | "hallazgos"
  | "normativas"
  | "parametros_sistema"
  | "planes_mitigacion"
  | "requisitos"
  | "riesgos"
  | "usuarios"
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
        where: {
          destinatario_id: userId,
          estado: "pendiente",
          deleted_at: null,
        },
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

  async createManyAlerts(data: Prisma.alertasUncheckedCreateInput[]) {
    if (data.length === 0) return [];
    return this.database.alertas.createManyAndReturn({
      data,
      skipDuplicates: true,
      select: {
        destinatario_id: true,
        mensaje: true,
        regla_codigo: true,
        severidad: true,
      },
    });
  }

  findRecipientEmails(ids: string[]) {
    return this.database.usuarios.findMany({
      where: { id: { in: ids }, estado: "activo", deleted_at: null },
      select: { id: true, correo: true },
    });
  }

  findRisksForAlertEvaluation() {
    return this.database.riesgos.findMany({
      where: {
        deleted_at: null,
        estado: { notIn: ["cerrado", "cancelado"] },
      },
      select: {
        id: true,
        propietario_id: true,
        creado_por: true,
        categoria_id: true,
        unidad_id: true,
        codigo: true,
        nivel_residual: true,
        categorias_riesgo: { select: { apetito_base: true } },
        planes_mitigacion: {
          where: { deleted_at: null, estado: "activo" },
          select: { id: true },
          take: 1,
        },
      },
    });
  }

  findEffectiveAppetites(date: Date) {
    return this.database.apetitos_riesgo.findMany({
      where: {
        vigente_desde: { lte: date },
        OR: [{ vigente_hasta: null }, { vigente_hasta: { gte: date } }],
      },
      select: {
        categoria_id: true,
        unidad_id: true,
        umbral: true,
        vigente_desde: true,
      },
      orderBy: { vigente_desde: "desc" },
    });
  }

  findOverdueMitigationPlans(date: Date) {
    return this.database.planes_mitigacion.findMany({
      where: {
        fecha_limite: { lt: date },
        estado: "activo",
        deleted_at: null,
      },
      select: { id: true, responsable_id: true },
    });
  }

  findOverdueMitigationActions(date: Date) {
    return this.database.acciones_mitigacion.findMany({
      where: {
        fecha_limite: { lt: date },
        estado: "activo",
        deleted_at: null,
      },
      select: { id: true, responsable_id: true },
    });
  }

  findCriticalFindingsWithoutResponse() {
    return this.database.hallazgos.findMany({
      where: {
        severidad: "critica",
        respuesta: null,
        estado: { not: "cerrado" },
        deleted_at: null,
      },
      select: {
        id: true,
        responsable_id: true,
        auditorias: { select: { responsable_id: true } },
      },
    });
  }

  findNonCompliantEvaluations() {
    return this.database.evaluaciones_cumplimiento.findMany({
      where: {
        resultado: "no_conforme",
        deleted_at: null,
        responsable_plan_id: { not: null },
      },
      select: { id: true, responsable_plan_id: true },
    });
  }

  findExpiringRegulations(until: Date, from: Date) {
    return this.database.normativas.findMany({
      where: {
        estado: "vigente",
        deleted_at: null,
        vigencia_fin: { gte: from, lte: until },
      },
      select: { id: true, nombre: true },
    });
  }

  findExpiringRequirements(until: Date, from: Date) {
    return this.database.requisitos.findMany({
      where: {
        vigente: true,
        deleted_at: null,
        vigencia_fin: { gte: from, lte: until },
      },
      select: { id: true, codigo: true },
    });
  }

  findComplianceRecipients() {
    return this.database.usuarios.findMany({
      where: {
        estado: "activo",
        deleted_at: null,
        usuario_roles: {
          some: {
            roles: {
              estado: "activo",
              permisos_rol: {
                some: {
                  puede_actualizar: true,
                  modulos: { codigo: "cumplimiento" },
                },
              },
            },
          },
        },
      },
      select: { id: true },
    });
  }

  findKeyControls() {
    return this.database.controles.findMany({
      where: {
        es_clave: true,
        estado: "activo",
        deleted_at: null,
        riesgos: { deleted_at: null, propietario_id: { not: null } },
      },
      select: {
        id: true,
        efectividad: true,
        riesgos: { select: { codigo: true, propietario_id: true } },
      },
    });
  }

  findControlUpdateHistory(controlIds: string[]) {
    if (controlIds.length === 0) return Promise.resolve([]);
    return this.database.bitacora.findMany({
      where: {
        entidad: "controles",
        accion: "update",
        entidad_id: { in: controlIds },
      },
      select: { entidad_id: true, detalles: true, fecha: true },
      orderBy: [{ fecha: "desc" }, { id: "desc" }],
    });
  }

  findAlertDaysParameter() {
    return this.database.parametros_sistema.findUnique({
      where: { clave: "alerta_dias_vencimiento" },
      select: { valor: true },
    });
  }
}
