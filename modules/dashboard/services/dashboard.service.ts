import { DashboardRepository } from "@/modules/dashboard/repositories/dashboard.repository";
import type { DashboardSummary } from "@/modules/dashboard/types/dashboard.types";
import type { DashboardFilter } from "@/modules/dashboard/validators/dashboard.validator";
import type { AuthPrincipal } from "@/modules/auth/types/auth.types";
import { AppError } from "@/lib/app-error";

export class DashboardService {
  constructor(private readonly repository = new DashboardRepository()) {}

  async getSummary(
    filter: DashboardFilter,
    principal: AuthPrincipal,
  ): Promise<DashboardSummary> {
    const reportPermissions = principal.permissions.filter(
      (permission) =>
        permission.module === "reportes" && permission.canRead,
    );
    if (reportPermissions.length === 0) {
      throw new AppError(
        "FORBIDDEN",
        "No tienes permiso para consultar el dashboard.",
        403,
      );
    }
    const hasGlobalScope = reportPermissions.some(
      (permission) => permission.scope === "global",
    );
    const unitIdsScope = hasGlobalScope ? undefined : principal.unitIds;

    const [
      riskMetrics,
      controlEffectiveness,
      compliance,
      findings,
      mitigation,
      auditCoverage,
      alertMetrics,
    ] = await Promise.all([
      this.repository.getRiskMetrics(filter, unitIdsScope),
      this.repository.getControlMetrics(filter, unitIdsScope),
      this.repository.getComplianceMetrics(filter, unitIdsScope),
      this.repository.getFindingsMetrics(filter, unitIdsScope),
      this.repository.getMitigationMetrics(filter, unitIdsScope),
      this.repository.getAuditCoverage(filter, unitIdsScope),
      this.repository.getAlertMetrics(
        filter,
        principal.userId,
        unitIdsScope,
      ),
    ]);

    return {
      totalRisks: riskMetrics.totalRisks,
      criticalRisks: riskMetrics.criticalRisks,
      riskDistribution: riskMetrics.riskDistribution,
      heatmap: riskMetrics.heatmap,
      controlEffectiveness,
      compliance,
      findings,
      activeAlerts: alertMetrics.activeAlerts,
      risksOverAppetite: riskMetrics.risksOverAppetite,
      overdueMitigationItems: mitigation.overdueItems,
      mitigationProgress: mitigation.progress,
      averageAlertAttentionHours: alertMetrics.averageAttentionHours,
      auditCoverage,
      criticalityRanges: riskMetrics.criticalityRanges,
    };
  }
}
