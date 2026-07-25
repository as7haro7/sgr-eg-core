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
  | "controles"
  | "evaluaciones_cumplimiento"
  | "hallazgos"
  | "parametros_sistema"
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
    const [risks, rangeParameter] = await Promise.all([
      this.database.riesgos.findMany({
        where: this.buildRiskWhere(filter, unitIdsScope),
        select: {
          nivel_residual: true,
          probabilidad: true,
          impacto: true,
        },
      }),
      this.database.parametros_sistema.findUnique({
        where: { clave: "criticidad_rangos" },
        select: { valor: true },
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

  getAlertsCount(userId: string) {
    return this.database.alertas.count({
      where: {
        destinatario_id: userId,
        estado: "pendiente",
        deleted_at: null,
      },
    });
  }
}
