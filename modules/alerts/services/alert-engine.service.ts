import type { Prisma } from "@/generated/prisma/client";
import { logger } from "@/lib/logger";
import { AlertRepository } from "@/modules/alerts/repositories/alert.repository";
import { AlertEmailService } from "@/modules/alerts/services/alert-email.service";
import {
  classifyRiskLevel,
  parseCriticalityRanges,
} from "@/modules/risks/constants/criticality";

const DEFAULT_ALERT_DAYS = 30;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readEffectiveness(value: unknown): number | null {
  if (!isRecord(value)) return null;
  const effectiveness = Number(value.efectividad);
  return Number.isFinite(effectiveness) ? effectiveness : null;
}

function parameterAsNonNegativeInteger(
  value: unknown,
  fallback: number,
): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
}

export class AlertEngineService {
  constructor(
    private readonly repository = new AlertRepository(),
    private readonly emailService = new AlertEmailService(),
  ) {}

  async runEngine() {
    logger.info("Iniciando motor de alertas");
    const now = new Date();
    now.setUTCHours(0, 0, 0, 0);

    const [
      risks,
      appetites,
      overduePlans,
      overdueActions,
      criticalFindings,
      nonCompliantEvaluations,
      alertDaysParameter,
      complianceRecipients,
      keyControls,
      criticalityParameter,
    ] = await Promise.all([
      this.repository.findRisksForAlertEvaluation(),
      this.repository.findEffectiveAppetites(now),
      this.repository.findOverdueMitigationPlans(now),
      this.repository.findOverdueMitigationActions(now),
      this.repository.findCriticalFindingsWithoutResponse(now),
      this.repository.findNonCompliantEvaluations(),
      this.repository.findAlertDaysParameter(),
      this.repository.findComplianceRecipients(),
      this.repository.findKeyControls(),
      this.repository.findCriticalityRangesParameter(),
    ]);
    const criticalityRanges = parseCriticalityRanges(
      criticalityParameter?.valor,
    );

    const alertDays = parameterAsNonNegativeInteger(
      alertDaysParameter?.valor,
      DEFAULT_ALERT_DAYS,
    );
    const expiringUntil = new Date(now);
    expiringUntil.setUTCDate(expiringUntil.getUTCDate() + alertDays);
    const [expiringRegulations, expiringRequirements, controlHistory] =
      await Promise.all([
        this.repository.findExpiringRegulations(expiringUntil, now),
        this.repository.findExpiringRequirements(expiringUntil, now),
        this.repository.findControlUpdateHistory(
          keyControls.map(({ id }) => id),
        ),
      ]);

    const alerts: Prisma.alertasUncheckedCreateInput[] = [];
    const unitIds = [
      ...new Set([
        ...risks.map(({ unidad_id }) => unidad_id),
        ...overduePlans.map(({ riesgos }) => riesgos.unidad_id),
        ...overdueActions.map(
          ({ planes_mitigacion }) =>
            planes_mitigacion.riesgos.unidad_id,
        ),
        ...criticalFindings.flatMap(({ auditorias }) =>
          auditorias.unidad_id ? [auditorias.unidad_id] : [],
        ),
        ...nonCompliantEvaluations.map(({ unidad_id }) => unidad_id),
        ...keyControls.map(({ riesgos }) => riesgos.unidad_id),
      ]),
    ];
    const [analysts, complianceUsers, managers, administrators] =
      await Promise.all([
      this.repository.findRecipientsByRolesForUnits(
        ["analista_riesgos"],
        unitIds,
      ),
      this.repository.findRecipientsByRolesForUnits(
        ["responsable_cumplimiento"],
        unitIds,
      ),
      this.repository.findRecipientsByRoles(["gerencia"]),
      this.repository.findRecipientsByRoles(["administrador"]),
    ]);
    const groupByUnit = (
      users: Array<{
        id: string;
        usuario_unidades: Array<{ unidad_id: string }>;
      }>,
    ) => {
      const groups = new Map<string, Array<{ id: string }>>();

      for (const user of users) {
        for (const { unidad_id: unitId } of user.usuario_unidades) {
          const group = groups.get(unitId) ?? [];
          group.push({ id: user.id });
          groups.set(unitId, group);
        }
      }

      return groups;
    };
    const analystsByUnit = groupByUnit(analysts);
    const complianceByUnit = groupByUnit(complianceUsers);
    const recipientIds = (
      explicit: Array<string | null | undefined>,
      additional: Array<{ id: string }> = [],
    ) => [
      ...new Set([
        ...explicit.filter((id): id is string => Boolean(id)),
        ...additional.map(({ id }) => id),
      ]),
    ];
    const addAlerts = (
      recipients: string[],
      build: (recipientId: string) => Prisma.alertasUncheckedCreateInput,
    ) => {
      for (const recipientId of recipients) {
        alerts.push(build(recipientId));
      }
    };
    const appetiteByScope = new Map<string, number>();
    for (const appetite of appetites) {
      const key = `${appetite.categoria_id}:${appetite.unidad_id ?? "*"}`;
      if (!appetiteByScope.has(key)) {
        appetiteByScope.set(key, appetite.umbral.toNumber());
      }
    }

    // AL-01: residual superior al apetito vigente.
    for (const risk of risks) {
      if (!risk.propietario_id) continue;
      const appetite =
        appetiteByScope.get(`${risk.categoria_id}:${risk.unidad_id}`) ??
        appetiteByScope.get(`${risk.categoria_id}:*`) ??
        risk.categorias_riesgo.apetito_base.toNumber();
      if (risk.nivel_residual.toNumber() <= appetite) continue;

      const severity =
        classifyRiskLevel(
          risk.nivel_residual.toNumber(),
          criticalityRanges,
        ) === "critical"
          ? "critica"
          : "alta";
      addAlerts(
        recipientIds(
          [risk.propietario_id],
          [
            ...(analystsByUnit.get(risk.unidad_id) ?? []),
            ...managers,
          ],
        ),
        (recipientId) => ({
          regla_codigo: "AL-01",
          severidad: severity,
          riesgo_id: risk.id,
          destinatario_id: recipientId,
          mensaje: `El riesgo ${risk.codigo} supera el apetito vigente (${appetite}).`,
        }),
      );
    }

    // AL-02: planes o acciones vencidos.
    for (const plan of overduePlans) {
      addAlerts(
        recipientIds(
          [plan.responsable_id],
          analystsByUnit.get(plan.riesgos.unidad_id) ?? [],
        ),
        (recipientId) => ({
          regla_codigo: "AL-02",
          severidad: "alta",
          plan_id: plan.id,
          destinatario_id: recipientId,
          mensaje: "El plan de mitigación está vencido.",
        }),
      );
    }
    for (const action of overdueActions) {
      const unitId = action.planes_mitigacion.riesgos.unidad_id;
      addAlerts(
        recipientIds(
          [action.responsable_id],
          analystsByUnit.get(unitId) ?? [],
        ),
        (recipientId) => ({
          regla_codigo: "AL-02",
          severidad: "alta",
          accion_id: action.id,
          destinatario_id: recipientId,
          mensaje: "La acción de mitigación está vencida.",
        }),
      );
    }

    // AL-03: hallazgo crítico sin respuesta.
    for (const finding of criticalFindings) {
      addAlerts(
        recipientIds(
          [
            finding.responsable_id,
            finding.auditorias.responsable_id,
          ],
          managers,
        ),
        (recipientId) => ({
          regla_codigo: "AL-03",
          severidad: "critica",
          hallazgo_id: finding.id,
          destinatario_id: recipientId,
          mensaje:
            "Existe un hallazgo crítico vencido que todavía no tiene respuesta.",
        }),
      );
    }

    // AL-04: requisito evaluado como no conforme.
    for (const evaluation of nonCompliantEvaluations) {
      if (!evaluation.responsable_plan_id) continue;
      addAlerts(
        recipientIds(
          [evaluation.responsable_plan_id],
          complianceByUnit.get(evaluation.unidad_id) ?? [],
        ),
        (recipientId) => ({
          regla_codigo: "AL-04",
          severidad: "alta",
          evaluacion_id: evaluation.id,
          destinatario_id: recipientId,
          mensaje:
            "La evaluación no conforme requiere seguimiento del plan de acción.",
        }),
      );
    }

    // AL-05: normativa o requisito próximo a vencer.
    for (const recipient of complianceRecipients) {
      for (const regulation of expiringRegulations) {
        alerts.push({
          regla_codigo: "AL-05",
          severidad: "media",
          normativa_id: regulation.id,
          destinatario_id: recipient.id,
          mensaje: `La normativa ${regulation.nombre} está próxima a vencer.`,
        });
      }
      for (const requirement of expiringRequirements) {
        alerts.push({
          regla_codigo: "AL-05",
          severidad: "media",
          requisito_id: requirement.id,
          destinatario_id: recipient.id,
          mensaje: `El requisito ${requirement.codigo} está próximo a vencer.`,
        });
      }
    }

    // AL-06: riesgo crítico sin propietario o sin plan activo.
    for (const risk of risks) {
      if (
        classifyRiskLevel(
          risk.nivel_residual.toNumber(),
          criticalityRanges,
        ) !== "critical" ||
        (risk.propietario_id && risk.planes_mitigacion.length > 0)
      ) {
        continue;
      }
      addAlerts(
        recipientIds([], [...administrators, ...managers]),
        (recipientId) => ({
          regla_codigo: "AL-06",
          severidad: "critica",
          riesgo_id: risk.id,
          destinatario_id: recipientId,
          mensaje: `El riesgo crítico ${risk.codigo} no tiene propietario o plan activo.`,
        }),
      );
    }

    // AL-07: control clave cuya efectividad se redujo en el último cambio.
    const latestHistory = new Map<string, (typeof controlHistory)[number]>();
    for (const entry of controlHistory) {
      if (entry.entidad_id && !latestHistory.has(entry.entidad_id)) {
        latestHistory.set(entry.entidad_id, entry);
      }
    }
    for (const control of keyControls) {
      const details = latestHistory.get(control.id)?.detalles;
      if (!isRecord(details)) continue;
      const previous = readEffectiveness(details.anterior);
      const current = readEffectiveness(details.nuevo);
      if (
        previous === null ||
        current === null ||
        current >= previous ||
        !control.riesgos.propietario_id
      ) {
        continue;
      }
      addAlerts(
        recipientIds(
          [control.riesgos.propietario_id],
          analystsByUnit.get(control.riesgos.unidad_id) ?? [],
        ),
        (recipientId) => ({
          regla_codigo: "AL-07",
          severidad: "alta",
          control_id: control.id,
          destinatario_id: recipientId,
          mensaje: `La efectividad de un control clave del riesgo ${control.riesgos.codigo} se redujo de ${previous}% a ${current}%.`,
        }),
      );
    }

    const created = await this.repository.createManyAlerts(alerts);
    const recipients = await this.repository.findRecipientEmails([
      ...new Set(created.map(({ destinatario_id }) => destinatario_id)),
    ]);
    const emailByUser = new Map(
      recipients.map(({ id, correo }) => [id, correo]),
    );
    await this.emailService.notify(
      created.flatMap((alert) => {
        const email = emailByUser.get(alert.destinatario_id);
        return email
          ? [{
              email,
              message: alert.mensaje,
              ruleCode: alert.regla_codigo,
              severity: alert.severidad,
            }]
          : [];
      }),
    );
    logger.info("Motor de alertas finalizado", {
      evaluated: alerts.length,
      created: created.length,
    });

    return { evaluated: alerts.length, created: created.length };
  }
}
