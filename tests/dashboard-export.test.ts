import { strFromU8, unzipSync } from "fflate";
import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";

import {
  buildCsvReport,
  buildExcelReport,
  buildPdfReport,
} from "@/modules/dashboard/services/dashboard-export.service";
import type { DashboardSummary } from "@/modules/dashboard/types/dashboard.types";
import { dashboardFilterSchema } from "@/modules/dashboard/validators/dashboard.validator";

const summary: DashboardSummary = {
  totalRisks: 12,
  criticalRisks: 3,
  riskDistribution: [
    { level: "Bajo", count: 2, percentage: 16.67 },
    { level: "Moderado", count: 4, percentage: 33.33 },
    { level: "Alto", count: 3, percentage: 25 },
    { level: "Crítico", count: 3, percentage: 25 },
  ],
  heatmap: [
    { probability: 5, impact: 5, count: 2 },
    { probability: 3, impact: 4, count: 3 },
  ],
  controlEffectiveness: { high: 5, medium: 3, low: 1 },
  compliance: {
    compliant: 8,
    nonCompliant: 2,
    notApplicable: 1,
    total: 11,
    complianceRate: 80,
  },
  findings: { open: 3, inProgress: 2, closed: 5, overdue: 1 },
  activeAlerts: 4,
  risksOverAppetite: 3,
  overdueMitigationItems: 2,
  mitigationProgress: 64.5,
  averageAlertAttentionHours: 11.25,
  auditCoverage: { auditedUnits: 3, plannedUnits: 4, percentage: 75 },
  criticalityRanges: {
    low: [1, 4],
    moderate: [5, 9],
    high: [10, 16],
    critical: [17, 25],
  },
};

const context = {
  filter: dashboardFilterSchema.parse({
    status: "abierto",
    periodStart: "2026-01-01",
    periodEnd: "2026-12-31",
  }),
  generatedAt: new Date("2026-07-28T18:00:00.000Z"),
  generatedBy: "Gerencia QA",
  summary,
};

describe("Exportación ejecutiva del dashboard", () => {
  it("genera CSV compatible y protegido contra fórmulas", () => {
    const csv = buildCsvReport({
      ...context,
      generatedBy: "=USUARIO",
    });

    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain("Reporte ejecutivo SGR-EG");
    expect(csv).toContain("'=USUARIO");
    expect(csv).toContain("Riesgos críticos");
  });

  it("genera un Excel estructurado con tres hojas", async () => {
    const bytes = await buildExcelReport(context);
    expect([...bytes.slice(0, 2)]).toEqual([0x50, 0x4b]);

    const files = unzipSync(bytes);
    const workbook = strFromU8(files["xl/workbook.xml"]);
    const overview = strFromU8(files["xl/worksheets/sheet1.xml"]);
    expect(workbook).toContain('name="Resumen ejecutivo"');
    expect(workbook).toContain('name="Riesgos y matriz"');
    expect(workbook).toContain('name="Gestión y seguimiento"');
    expect(overview).toContain("SGR-EG | REPORTE EJECUTIVO");
  });

  it("genera un PDF ejecutivo válido de dos páginas", async () => {
    const bytes = await buildPdfReport(context);
    expect(new TextDecoder().decode(bytes.slice(0, 4))).toBe("%PDF");

    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBe(2);
    expect(pdf.getTitle()).toBe("Reporte ejecutivo SGR-EG");
  });
});
