import type { NextRequest } from "next/server";

import { errorResponse } from "@/lib/http-response";
import { requireAuthentication } from "@/modules/auth/services/auth-guard.service";
import { DashboardService } from "@/modules/dashboard/services/dashboard.service";
import { dashboardFilterSchema } from "@/modules/dashboard/validators/dashboard.validator";

const dashboardService = new DashboardService();

function csvCell(value: string | number | null): string {
  const text = value === null ? "" : String(value);
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safe.replaceAll('"', '""')}"`;
}

export async function GET(request: NextRequest) {
  try {
    const principal = await requireAuthentication(request);
    const filter = dashboardFilterSchema.parse(
      Object.fromEntries(request.nextUrl.searchParams),
    );
    const summary = await dashboardService.getSummary(filter, principal);
    const rows: Array<[string, string | number | null]> = [
      ["Indicador", "Valor"],
      ["Riesgos activos", summary.totalRisks],
      ["Riesgos críticos", summary.criticalRisks],
      ["Riesgos sobre apetito", summary.risksOverAppetite],
      ["Mitigaciones vencidas", summary.overdueMitigationItems],
      ["Avance de mitigación (%)", summary.mitigationProgress.toFixed(2)],
      ["Cumplimiento (%)", summary.compliance.complianceRate.toFixed(2)],
      [
        "Hallazgos abiertos",
        summary.findings.open + summary.findings.inProgress,
      ],
      ["Alertas activas", summary.activeAlerts],
      [
        "Tiempo medio de atención (horas)",
        summary.averageAlertAttentionHours?.toFixed(2) ?? null,
      ],
      ["Cobertura de auditoría (%)", summary.auditCoverage.percentage.toFixed(2)],
    ];
    const csv = `\uFEFF${rows
      .map((row) => row.map(csvCell).join(","))
      .join("\r\n")}\r\n`;
    const date = new Date().toISOString().slice(0, 10);

    return new Response(csv, {
      status: 200,
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="sgr-eg-reporte-${date}.csv"`,
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
