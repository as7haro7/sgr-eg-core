import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { TransactionClient } from "@/lib/transaction";
import type { DashboardFilter } from "@/modules/dashboard/validators/dashboard.validator";
import {
  classifyRiskLevel,
  parseCriticalityRanges,
} from "@/modules/risks/constants/criticality";

type DashboardDatabaseClient = Pick<
  TransactionClient,
  | "alertas"
  | "acciones_mitigacion"
  | "apetitos_riesgo"
  | "auditorias"
  | "controles"
  | "evaluaciones_cumplimiento"
  | "hallazgos"
  | "parametros_sistema"
  | "planes_mitigacion"
  | "riesgos"
>;

export class DashboardRepository {
  constructor(private readonly database: DashboardDatabaseClient = prisma) {}

  private buildUnitWhere(
    filter: DashboardFilter,
    unitIdsScope?: string[],
  ): Prisma.unidades_negocioWhereInput {
    return {
      AND: [
        filter.unitId ? { id: filter.unitId } : {},
        filter.countryId ? { pais_id: filter.countryId } : {},
        unitIdsScope ? { id: { in: unitIdsScope } } : {},
      ],
    };
  }

  private buildRiskWhere(
    filter: DashboardFilter,
    unitIdsScope?: string[],
  ): Prisma.riesgosWhereInput {
    return {
      deleted_at: null,
      categoria_id: filter.categoryId,
      propietario_id: filter.ownerId,
      estado: filter.status,
      unidades_negocio: this.buildUnitWhere(filter, unitIdsScope),
      ...(filter.periodStart || filter.periodEnd
        ? {
            created_at: {
              gte: filter.periodStart,
              lte: filter.periodEnd,
            },
          }
        : {}),
    };
  }

  async getRiskMetrics(
    filter: DashboardFilter,
    unitIdsScope?: string[],
  ) {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const [risks, rangeParameter, appetites] = await Promise.all([
      this.database.riesgos.findMany({
        where: this.buildRiskWhere(filter, unitIdsScope),
        select: {
          nivel_residual: true,
          probabilidad: true,
          impacto: true,
          categoria_id: true,
          unidad_id: true,
          categorias_riesgo: { select: { apetito_base: true } },
        },
      }),
      this.database.parametros_sistema.findUnique({
        where: { clave: "criticidad_rangos" },
        select: { valor: true },
      }),
      this.database.apetitos_riesgo.findMany({
        where: {
          vigente_desde: { lte: today },
          OR: [{ vigente_hasta: null }, { vigente_hasta: { gte: today } }],
        },
        select: {
          categoria_id: true,
          unidad_id: true,
          umbral: true,
        },
        orderBy: { vigente_desde: "desc" },
      }),
    ]);
    const ranges = parseCriticalityRanges(rangeParameter?.valor);
    const totalRisks = risks.length;
    const distribution = {
      low: 0,
      moderate: 0,
      high: 0,
      critical: 0,
    };

    for (const risk of risks) {
      distribution[
        classifyRiskLevel(risk.nivel_residual.toNumber(), ranges)
      ]++;
    }
    const appetiteByScope = new Map<string, number>();
    for (const appetite of appetites) {
      const key = `${appetite.categoria_id}:${appetite.unidad_id ?? "*"}`;
      if (!appetiteByScope.has(key)) {
        appetiteByScope.set(key, appetite.umbral.toNumber());
      }
    }
    const risksOverAppetite = risks.filter((risk) => {
      const threshold =
        appetiteByScope.get(`${risk.categoria_id}:${risk.unidad_id}`) ??
        appetiteByScope.get(`${risk.categoria_id}:*`) ??
        risk.categorias_riesgo.apetito_base.toNumber();
      return risk.nivel_residual.toNumber() > threshold;
    }).length;

    const riskDistribution = [
      { level: "Bajo", count: distribution.low },
      { level: "Moderado", count: distribution.moderate },
      { level: "Alto", count: distribution.high },
      { level: "Crítico", count: distribution.critical },
    ].map((item) => ({
      ...item,
      percentage: totalRisks ? (item.count / totalRisks) * 100 : 0,
    }));

    const heatmapMap = new Map<string, number>();
    for (let probability = 1; probability <= 5; probability++) {
      for (let impact = 1; impact <= 5; impact++) {
        heatmapMap.set(`${probability}-${impact}`, 0);
      }
    }
    for (const risk of risks) {
      const key = `${risk.probabilidad}-${risk.impacto}`;
      heatmapMap.set(key, (heatmapMap.get(key) ?? 0) + 1);
    }

    const heatmap = Array.from(heatmapMap.entries()).map(([key, count]) => {
      const [probability, impact] = key.split("-").map(Number);
      return { probability, impact, count };
    });

    return {
      totalRisks,
      criticalRisks: distribution.critical,
      riskDistribution,
      heatmap,
      risksOverAppetite,
      criticalityRanges: ranges,
    };
  }

  async getMitigationMetrics(
    filter: DashboardFilter,
    unitIdsScope?: string[],
  ) {
    const riskWhere = this.buildRiskWhere(filter, unitIdsScope);
    const [plans, overdueActions] = await Promise.all([
      this.database.planes_mitigacion.findMany({
        where: {
          deleted_at: null,
          riesgos: riskWhere,
        },
        select: {
          avance: true,
          estado: true,
          fecha_limite: true,
          riesgos: { select: { nivel_residual: true } },
        },
      }),
      this.database.acciones_mitigacion.count({
        where: {
          deleted_at: null,
          estado: { notIn: ["completado", "cancelado"] },
          fecha_limite: { lt: new Date() },
          planes_mitigacion: { riesgos: riskWhere },
        },
      }),
    ]);
    const now = new Date();
    const overduePlans = plans.filter(
      (plan) =>
        !["completado", "cancelado"].includes(plan.estado) &&
        plan.fecha_limite < now,
    ).length;
    const weighted = plans.reduce(
      (accumulator, plan) => {
        const weight = Math.max(
          1,
          plan.riesgos.nivel_residual.toNumber(),
        );
        return {
          total: accumulator.total + plan.avance.toNumber() * weight,
          weight: accumulator.weight + weight,
        };
      },
      { total: 0, weight: 0 },
    );

    return {
      overdueItems: overduePlans + overdueActions,
      progress: weighted.weight > 0 ? weighted.total / weighted.weight : 0,
    };
  }

  async getAuditCoverage(
    filter: DashboardFilter,
    unitIdsScope?: string[],
  ) {
    const audits = await this.database.auditorias.findMany({
      where: {
        deleted_at: null,
        unidad_id: { not: null },
        unidades_negocio: this.buildUnitWhere(filter, unitIdsScope),
        ...(filter.periodStart || filter.periodEnd
          ? {
              fecha_inicio: { lte: filter.periodEnd },
              OR: [
                { fecha_fin: null },
                { fecha_fin: { gte: filter.periodStart } },
              ],
            }
          : {}),
      },
      select: { unidad_id: true, estado: true },
    });
    const plannedUnits = new Set(
      audits.flatMap(({ unidad_id }) => (unidad_id ? [unidad_id] : [])),
    );
    const auditedUnits = new Set(
      audits.flatMap(({ estado, unidad_id }) =>
        estado === "cerrada" && unidad_id ? [unidad_id] : [],
      ),
    );

    return {
      auditedUnits: auditedUnits.size,
      plannedUnits: plannedUnits.size,
      percentage:
        plannedUnits.size > 0
          ? (auditedUnits.size / plannedUnits.size) * 100
          : 0,
    };
  }

  async getControlMetrics(
    filter: DashboardFilter,
    unitIdsScope?: string[],
  ) {
    const controls = await this.database.controles.findMany({
      where: {
        deleted_at: null,
        estado: "activo",
        riesgos: this.buildRiskWhere(filter, unitIdsScope),
      },
      select: { efectividad: true },
    });
    const effectiveness = { high: 0, medium: 0, low: 0 };
    for (const control of controls) {
      const value = control.efectividad.toNumber();
      if (value >= 80) effectiveness.high++;
      else if (value >= 50) effectiveness.medium++;
      else effectiveness.low++;
    }
    return effectiveness;
  }

  async getComplianceMetrics(
    filter: DashboardFilter,
    unitIdsScope?: string[],
  ) {
    const evaluations =
      await this.database.evaluaciones_cumplimiento.groupBy({
        by: ["resultado"],
        where: {
          deleted_at: null,
          unidades_negocio: this.buildUnitWhere(filter, unitIdsScope),
          ...(filter.periodStart || filter.periodEnd
            ? {
                periodo_inicio: { lte: filter.periodEnd },
                periodo_fin: { gte: filter.periodStart },
              }
            : {}),
        },
        _count: true,
      });
    const metrics = {
      compliant: 0,
      nonCompliant: 0,
      notApplicable: 0,
      total: 0,
    };
    for (const evaluation of evaluations) {
      if (evaluation.resultado === "conforme") {
        metrics.compliant = evaluation._count;
      } else if (evaluation.resultado === "no_conforme") {
        metrics.nonCompliant = evaluation._count;
      } else if (evaluation.resultado === "no_aplicable") {
        metrics.notApplicable = evaluation._count;
      }
      metrics.total += evaluation._count;
    }
    const applicable = metrics.total - metrics.notApplicable;
    return {
      ...metrics,
      complianceRate:
        applicable > 0 ? (metrics.compliant / applicable) * 100 : 100,
    };
  }

  async getFindingsMetrics(
    filter: DashboardFilter,
    unitIdsScope?: string[],
  ) {
    const findings = await this.database.hallazgos.findMany({
      where: {
        deleted_at: null,
        responsable_id: filter.ownerId,
        auditorias: {
          unidades_negocio: this.buildUnitWhere(filter, unitIdsScope),
        },
        ...(filter.periodStart || filter.periodEnd
          ? {
              created_at: {
                gte: filter.periodStart,
                lte: filter.periodEnd,
              },
            }
          : {}),
      },
      select: { estado: true, fecha_limite: true },
    });
    const metrics = { open: 0, inProgress: 0, closed: 0, overdue: 0 };
    const now = new Date();
    for (const finding of findings) {
      if (finding.estado === "abierto") metrics.open++;
      else if (finding.estado === "en_seguimiento") metrics.inProgress++;
      else metrics.closed++;
      if (
        finding.estado !== "cerrado" &&
        finding.fecha_limite &&
        finding.fecha_limite < now
      ) {
        metrics.overdue++;
      }
    }
    return metrics;
  }

  async getAlertMetrics(
    filter: DashboardFilter,
    userId: string,
    unitIdsScope?: string[],
  ) {
    const scopeWhere: Prisma.alertasWhereInput | undefined = unitIdsScope
      ? {
          OR: [
            { destinatario_id: userId },
            { riesgos: { unidad_id: { in: unitIdsScope } } },
            { controles: { riesgos: { unidad_id: { in: unitIdsScope } } } },
            {
              planes_mitigacion: {
                riesgos: { unidad_id: { in: unitIdsScope } },
              },
            },
            {
              acciones_mitigacion: {
                planes_mitigacion: {
                  riesgos: { unidad_id: { in: unitIdsScope } },
                },
              },
            },
            { hallazgos: { auditorias: { unidad_id: { in: unitIdsScope } } } },
            {
              evaluaciones_cumplimiento: {
                unidad_id: { in: unitIdsScope },
              },
            },
          ],
        }
      : undefined;
    const periodWhere =
      filter.periodStart || filter.periodEnd
        ? {
            generada_at: {
              gte: filter.periodStart,
              lte: filter.periodEnd,
            },
          }
        : {};
    const [activeAlerts, attended] = await Promise.all([
      this.database.alertas.count({
        where: {
          estado: "pendiente",
          deleted_at: null,
          ...periodWhere,
          AND: scopeWhere ? [scopeWhere] : undefined,
        },
      }),
      this.database.alertas.findMany({
        where: {
          estado: "atendida",
          atendida_at: { not: null },
          deleted_at: null,
          ...periodWhere,
          AND: scopeWhere ? [scopeWhere] : undefined,
        },
        select: { generada_at: true, atendida_at: true },
      }),
    ]);
    const totalHours = attended.reduce((sum, alert) => {
      if (!alert.atendida_at) return sum;
      return (
        sum +
        (alert.atendida_at.getTime() - alert.generada_at.getTime()) /
          3_600_000
      );
    }, 0);

    return {
      activeAlerts,
      averageAttentionHours:
        attended.length > 0 ? totalHours / attended.length : null,
    };
  }
}
