import { DashboardRepository } from "@/modules/dashboard/repositories/dashboard.repository";
import type { DashboardSummary } from "@/modules/dashboard/types/dashboard.types";
import type { DashboardFilter } from "@/modules/dashboard/validators/dashboard.validator";
import type { AuthPrincipal } from "@/modules/auth/types/auth.types";

export class DashboardService {
  constructor(private readonly repository = new DashboardRepository()) {}

  async getSummary(
    filter: DashboardFilter,
    principal: AuthPrincipal,
  ): Promise<DashboardSummary> {
    // If the user does not have a global scope in any module, restrict their view to their units
    const hasGlobalScope = principal.permissions.some((p) => p.scope === "global");
    const unitIdsScope = hasGlobalScope ? [] : principal.unitIds;

    const [
      riskMetrics,
      controlEffectiveness,
      compliance,
      findings,
      activeAlerts,
    ] = await Promise.all([
      this.repository.getRiskMetrics(filter, unitIdsScope),
      this.repository.getControlMetrics(filter, unitIdsScope),
      this.repository.getComplianceMetrics(filter, unitIdsScope),
      this.repository.getFindingsMetrics(filter, unitIdsScope),
      this.repository.getAlertsCount(principal.userId),
    ]);

    return {
      totalRisks: riskMetrics.totalRisks,
      criticalRisks: riskMetrics.criticalRisks,
      riskDistribution: riskMetrics.riskDistribution,
      heatmap: riskMetrics.heatmap,
      controlEffectiveness,
      compliance,
      findings,
      activeAlerts,
    };
  }
}
