export interface RiskDistribution {
  level: string;
  count: number;
  percentage: number;
}

export interface ControlEffectiveness {
  high: number;
  medium: number;
  low: number;
}

export interface ComplianceSummary {
  compliant: number;
  nonCompliant: number;
  notApplicable: number;
  total: number;
  complianceRate: number;
}

export interface FindingsSummary {
  open: number;
  inProgress: number;
  closed: number;
  overdue: number;
}

export interface DashboardSummary {
  totalRisks: number;
  criticalRisks: number;
  riskDistribution: RiskDistribution[];
  heatmap: { probability: number; impact: number; count: number }[];
  controlEffectiveness: ControlEffectiveness;
  compliance: ComplianceSummary;
  findings: FindingsSummary;
  activeAlerts: number;
  risksOverAppetite: number;
  overdueMitigationItems: number;
  mitigationProgress: number;
  averageAlertAttentionHours: number | null;
  auditCoverage: {
    auditedUnits: number;
    plannedUnits: number;
    percentage: number;
  };
  criticalityRanges: {
    low: readonly [number, number];
    moderate: readonly [number, number];
    high: readonly [number, number];
    critical: readonly [number, number];
  };
}
