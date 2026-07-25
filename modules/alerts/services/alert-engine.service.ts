import type { Prisma } from "@/generated/prisma/client";
import { logger } from "@/lib/logger";
import { AlertRepository } from "@/modules/alerts/repositories/alert.repository";

export class AlertEngineService {
  constructor(private readonly repository = new AlertRepository()) {}

  async runEngine() {
    logger.info("Iniciando motor de alertas...");
    const now = new Date();
    const alertsToCreate: Prisma.alertasUncheckedCreateInput[] = [];

    // AL-01: Riesgos críticos no aceptados
    const criticalRisks = await this.repository.findCriticalUnacceptedRisks();
    for (const risk of criticalRisks) {
      if (risk.propietario_id) {
        alertsToCreate.push({
          regla_codigo: "AL-01",
          severidad: "alta",
          riesgo_id: risk.id,
          destinatario_id: risk.propietario_id,
          mensaje: `El riesgo ${risk.codigo} tiene un nivel residual crítico y requiere atención.`,
        });
      }
    }

    // AL-02: Revisiones de riesgo vencidas
    const overdueReviews = await this.repository.findOverdueRiskReviews(now);
    for (const risk of overdueReviews) {
      if (risk.propietario_id) {
        alertsToCreate.push({
          regla_codigo: "AL-02",
          severidad: "media",
          riesgo_id: risk.id,
          destinatario_id: risk.propietario_id,
          mensaje: `La revisión del riesgo ${risk.codigo} está vencida.`,
        });
      }
    }

    // AL-03: Controles inefectivos
    const ineffectiveControls = await this.repository.findIneffectiveControls();
    for (const control of ineffectiveControls) {
      if (control.riesgos.propietario_id) {
        alertsToCreate.push({
          regla_codigo: "AL-03",
          severidad: "media",
          control_id: control.id,
          destinatario_id: control.riesgos.propietario_id,
          mensaje: `El control para el riesgo ${control.riesgos.codigo} tiene una efectividad baja.`,
        });
      }
    }

    // AL-04: Planes de mitigación atrasados
    const overduePlans = await this.repository.findOverdueMitigationPlans(now);
    for (const plan of overduePlans) {
      alertsToCreate.push({
        regla_codigo: "AL-04",
        severidad: "alta",
        plan_id: plan.id,
        destinatario_id: plan.responsable_id,
        mensaje: `El plan de mitigación está atrasado respecto a su fecha límite.`,
      });
    }

    // AL-05: Acciones de mitigación atrasadas
    const overdueActions = await this.repository.findOverdueMitigationActions(now);
    for (const action of overdueActions) {
      alertsToCreate.push({
        regla_codigo: "AL-05",
        severidad: "media",
        accion_id: action.id,
        destinatario_id: action.responsable_id,
        mensaje: `La acción de mitigación está vencida y requiere actualización.`,
      });
    }

    // AL-06: Hallazgos no cerrados
    const overdueFindings = await this.repository.findOverdueFindings(now);
    for (const finding of overdueFindings) {
      if (finding.responsable_id) {
        alertsToCreate.push({
          regla_codigo: "AL-06",
          severidad: "alta",
          hallazgo_id: finding.id,
          destinatario_id: finding.responsable_id,
          mensaje: `El hallazgo ha superado la fecha límite para su resolución.`,
        });
      }
    }

    // AL-07: Evaluaciones de cumplimiento no conformes
    const nonCompliant = await this.repository.findNonCompliantEvaluations();
    for (const evaluation of nonCompliant) {
      if (evaluation.responsable_plan_id) {
        alertsToCreate.push({
          regla_codigo: "AL-07",
          severidad: "media",
          evaluacion_id: evaluation.id,
          destinatario_id: evaluation.responsable_plan_id,
          mensaje: `Se requiere un plan de acción para el incumplimiento detectado.`,
        });
      }
    }

    const createdCount = await this.repository.createManyAlerts(alertsToCreate);
    logger.info(`Motor de alertas finalizado. Generadas: ${createdCount} alertas nuevas.`);
    
    return { created: createdCount };
  }
}
