import {
  ShieldAlert,
  ShieldCheck,
  Target,
  FileWarning,
} from "lucide-react";
import type { DashboardSummary } from "@/modules/dashboard/types/dashboard.types";

interface DashboardKPIsProps {
  summary: DashboardSummary;
}

export function DashboardKPIs({ summary }: DashboardKPIsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex size-12 items-center justify-center rounded-xl bg-red-50 text-red-600">
            <ShieldAlert className="size-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Riesgos Críticos</p>
            <p className="text-2xl font-bold text-slate-950">
              {summary.criticalRisks} <span className="text-sm font-normal text-slate-500">de {summary.totalRisks}</span>
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex size-12 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
            <Target className="size-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Cumplimiento</p>
            <p className="text-2xl font-bold text-slate-950">
              {Math.round(summary.compliance.complianceRate)}%
            </p>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
          <span className="font-semibold text-slate-950">{summary.compliance.compliant}</span> conformes
          <span className="mx-1 text-slate-300">•</span>
          <span className="font-semibold text-slate-950">{summary.compliance.nonCompliant}</span> no conformes
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex size-12 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <FileWarning className="size-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Hallazgos Abiertos</p>
            <p className="text-2xl font-bold text-slate-950">
              {summary.findings.open + summary.findings.inProgress}
            </p>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
          <span className="font-semibold text-red-600">{summary.findings.overdue}</span> vencidos
          <span className="mx-1 text-slate-300">•</span>
          <span className="font-semibold text-green-600">{summary.findings.closed}</span> cerrados
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex size-12 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
            <ShieldCheck className="size-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Alertas Activas</p>
            <p className="text-2xl font-bold text-slate-950">
              {summary.activeAlerts}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
