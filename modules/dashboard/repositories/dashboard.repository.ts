import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { TransactionClient } from "@/lib/transaction";
import type { DashboardFilter } from "@/modules/dashboard/validators/dashboard.validator";

type DashboardDatabaseClient = Pick<
  TransactionClient,
  | "riesgos"
  | "controles"
  | "evaluaciones_cumplimiento"
  | "hallazgos"
  | "alertas"
>;

export class DashboardRepository {
  constructor(private readonly database: DashboardDatabaseClient = prisma) {}

  private buildUnitWhere(filter: DashboardFilter) {
    if (filter.unitId) return { unidad_id: filter.unitId };
    if (filter.countryId) return { unidades_negocio: { pais_id: filter.countryId } };
    return {};
  }

  async getRiskMetrics(filter: DashboardFilter, unitIdsScope: string[]) {
    const scopeWhere = unitIdsScope.length > 0 ? { unidad_id: { in: unitIdsScope } } : {};
    
    const where: Prisma.riesgosWhereInput = {
      deleted_at: null,
      estado: { not: "cerrado" },
      ...this.buildUnitWhere(filter),
      ...scopeWhere,
      ...(filter.periodStart || filter.periodEnd
        ? {
            created_at: {
              gte: filter.periodStart,
              lte: filter.periodEnd,
            },
          }
        : {}),
    };

    const risks = await this.database.riesgos.findMany({
      where,
      select: { nivel_residual: true, probabilidad: true, impacto: true },
    });

    const totalRisks = risks.length;
    let criticalRisks = 0;
    const distribution = {
      bajo: 0,
      medio: 0,
      alto: 0,
      critico: 0,
    };

    for (const risk of risks) {
      const value = risk.nivel_residual.toNumber();
      if (value < 5) distribution.bajo++;
      else if (value < 10) distribution.medio++;
      else if (value < 15) distribution.alto++;
      else {
        distribution.critico++;
        criticalRisks++;
      }
    }

    const riskDistribution = [
      { level: "Bajo", count: distribution.bajo, percentage: totalRisks ? (distribution.bajo / totalRisks) * 100 : 0 },
      { level: "Medio", count: distribution.medio, percentage: totalRisks ? (distribution.medio / totalRisks) * 100 : 0 },
      { level: "Alto", count: distribution.alto, percentage: totalRisks ? (distribution.alto / totalRisks) * 100 : 0 },
      { level: "Crítico", count: distribution.critico, percentage: totalRisks ? (distribution.critico / totalRisks) * 100 : 0 },
    ];

    // Initialize 5x5 heatmap with 0 counts
    const heatmapMap = new Map<string, number>();
    for (let p = 1; p <= 5; p++) {
      for (let i = 1; i <= 5; i++) {
        heatmapMap.set(`${p}-${i}`, 0);
      }
    }

    for (const risk of risks) {
      if (risk.probabilidad && risk.impacto) {
        const key = `${risk.probabilidad}-${risk.impacto}`;
        if (heatmapMap.has(key)) {
          heatmapMap.set(key, heatmapMap.get(key)! + 1);
        }
      }
    }

    const heatmap = Array.from(heatmapMap.entries()).map(([key, count]) => {
      const [probability, impact] = key.split("-").map(Number);
      return { probability, impact, count };
    });

    return { totalRisks, criticalRisks, riskDistribution, heatmap };
  }

  async getControlMetrics(filter: DashboardFilter, unitIdsScope: string[]) {
    const scopeWhere = unitIdsScope.length > 0 ? { riesgos: { unidad_id: { in: unitIdsScope } } } : {};
    
    const where: Prisma.controlesWhereInput = {
      deleted_at: null,
      estado: "activo",
      ...(filter.unitId || filter.countryId
        ? { riesgos: this.buildUnitWhere(filter) }
        : {}),
      ...scopeWhere,
    };

    const controls = await this.database.controles.findMany({
      where,
      select: { efectividad: true },
    });

    const effectiveness = { high: 0, medium: 0, low: 0 };
    for (const control of controls) {
      const val = control.efectividad.toNumber();
      if (val >= 80) effectiveness.high++;
      else if (val >= 50) effectiveness.medium++;
      else effectiveness.low++;
    }

    return effectiveness;
  }

  async getComplianceMetrics(filter: DashboardFilter, unitIdsScope: string[]) {
    const scopeWhere = unitIdsScope.length > 0 ? { unidad_id: { in: unitIdsScope } } : {};
    
    const where: Prisma.evaluaciones_cumplimientoWhereInput = {
      deleted_at: null,
      ...this.buildUnitWhere(filter),
      ...scopeWhere,
      ...(filter.periodStart || filter.periodEnd
        ? {
            periodo_fin: {
              gte: filter.periodStart,
              lte: filter.periodEnd,
            },
          }
        : {}),
    };

    const evaluations = await this.database.evaluaciones_cumplimiento.groupBy({
      by: ["resultado"],
      where,
      _count: true,
    });

    const metrics = { compliant: 0, nonCompliant: 0, notApplicable: 0, total: 0 };
    
    for (const ev of evaluations) {
      if (ev.resultado === "conforme") metrics.compliant = ev._count;
      else if (ev.resultado === "no_conforme") metrics.nonCompliant = ev._count;
      else if (ev.resultado === "no_aplicable") metrics.notApplicable = ev._count;
      metrics.total += ev._count;
    }
    
    const complianceRate =
      metrics.total - metrics.notApplicable > 0
        ? (metrics.compliant / (metrics.total - metrics.notApplicable)) * 100
        : 100;

    return { ...metrics, complianceRate };
  }

  async getFindingsMetrics(filter: DashboardFilter, unitIdsScope: string[]) {
    const scopeWhere = unitIdsScope.length > 0 ? { auditorias: { unidad_id: { in: unitIdsScope } } } : {};
    
    const where: Prisma.hallazgosWhereInput = {
      deleted_at: null,
      ...(filter.unitId || filter.countryId
        ? { auditorias: this.buildUnitWhere(filter) }
        : {}),
      ...scopeWhere,
      ...(filter.periodStart || filter.periodEnd
        ? {
            created_at: {
              gte: filter.periodStart,
              lte: filter.periodEnd,
            },
          }
        : {}),
    };

    const findings = await this.database.hallazgos.findMany({
      where,
      select: { estado: true, fecha_limite: true },
    });

    const metrics = { open: 0, inProgress: 0, closed: 0, overdue: 0 };
    const now = new Date();

    for (const finding of findings) {
      if (finding.estado === "abierto") metrics.open++;
      else if (finding.estado === "en_seguimiento") metrics.inProgress++;
      else if (finding.estado === "cerrado") metrics.closed++;

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

  async getAlertsCount(userId: string) {
    return this.database.alertas.count({
      where: {
        destinatario_id: userId,
        estado: "pendiente",
        deleted_at: null,
      },
    });
  }
}
