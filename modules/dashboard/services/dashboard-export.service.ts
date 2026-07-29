import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
} from "pdf-lib";

import {
  SimpleXlsxWorkbook,
  type SimpleXlsxBorders,
  type SimpleXlsxCell,
  type SimpleXlsxFill,
  type SimpleXlsxRow,
} from "@/lib/simple-xlsx";
import type { DashboardSummary } from "@/modules/dashboard/types/dashboard.types";
import type { DashboardFilter } from "@/modules/dashboard/validators/dashboard.validator";

export type DashboardExportFormat = "csv" | "pdf" | "xlsx";

interface DashboardExportContext {
  filter: DashboardFilter;
  generatedAt: Date;
  generatedBy: string;
  summary: DashboardSummary;
}

const BLUE = "1D4ED8";
const NAVY = "172554";
const SLATE = "475569";
const LIGHT_BLUE = "DBEAFE";
const LIGHT_SLATE = "F1F5F9";
const WHITE = "FFFFFF";

export function buildCsvReport({
  filter,
  generatedAt,
  generatedBy,
  summary,
}: DashboardExportContext): string {
  const rows: Array<Array<string | number | null>> = [
    ["Reporte ejecutivo SGR-EG", null],
    ["Generado por", generatedBy],
    ["Fecha de generación", formatDateTime(generatedAt)],
    ...filterRows(filter),
    [],
    ["Indicador", "Valor"],
    ...indicatorRows(summary),
  ];

  return `\uFEFF${rows
    .map((row) => row.map(csvCell).join(","))
    .join("\r\n")}\r\n`;
}

export async function buildExcelReport(
  context: DashboardExportContext,
): Promise<Uint8Array> {
  const { filter, generatedAt, generatedBy, summary } = context;
  const workbook = new SimpleXlsxWorkbook();
  workbook.creator = "SGR-EG";
  workbook.created = generatedAt;
  workbook.modified = generatedAt;
  workbook.subject = "Reporte ejecutivo de gestión de riesgos";
  workbook.title = "Reporte ejecutivo SGR-EG";

  const overview = workbook.addWorksheet("Resumen ejecutivo", {
    pageSetup: {
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      paperSize: 9,
    },
    views: [{ showGridLines: false }],
  });
  overview.columns = [
    { width: 30 },
    { width: 18 },
    { width: 3 },
    { width: 30 },
    { width: 18 },
    { width: 3 },
  ];
  overview.mergeCells("A1:F2");
  const title = overview.getCell("A1");
  title.value = "SGR-EG | REPORTE EJECUTIVO";
  title.font = { bold: true, color: { argb: WHITE }, size: 22 };
  title.alignment = { vertical: "middle", horizontal: "left" };
  title.fill = solidFill(NAVY);
  overview.getRow(1).height = 28;
  overview.getRow(2).height = 16;

  overview.mergeCells("A3:F3");
  const subtitle = overview.getCell("A3");
  subtitle.value =
    `Generado por ${generatedBy} · ${formatDateTime(generatedAt)}`;
  subtitle.font = { color: { argb: SLATE }, italic: true, size: 10 };
  subtitle.alignment = { vertical: "middle" };
  overview.getRow(3).height = 22;

  const indicators = indicatorRows(summary);
  indicators.forEach(([label, value], index) => {
    const block = Math.floor(index / 2);
    const isRight = index % 2 === 1;
    const row = 5 + block * 2;
    const labelColumn = isRight ? 4 : 1;
    const valueColumn = labelColumn + 1;
    overview.getCell(row, labelColumn).value = label;
    overview.getCell(row, labelColumn).font = {
      bold: true,
      color: { argb: SLATE },
      size: 10,
    };
    overview.getCell(row, labelColumn).fill = solidFill(LIGHT_SLATE);
    overview.getCell(row, valueColumn).value = value;
    overview.getCell(row, valueColumn).font = {
      bold: true,
      color: { argb: BLUE },
      size: 16,
    };
    overview.getCell(row, valueColumn).fill = solidFill(LIGHT_BLUE);
    overview.getCell(row, valueColumn).alignment = {
      horizontal: "center",
      vertical: "middle",
    };
    for (const column of [labelColumn, valueColumn]) {
      overview.getCell(row, column).border = thinBorder();
      overview.getCell(row + 1, column).fill =
        column === labelColumn ? solidFill(LIGHT_SLATE) : solidFill(LIGHT_BLUE);
      overview.getCell(row + 1, column).border = thinBorder();
    }
    overview.mergeCells(row, labelColumn, row + 1, labelColumn);
    overview.mergeCells(row, valueColumn, row + 1, valueColumn);
    overview.getRow(row).height = 23;
    overview.getRow(row + 1).height = 10;
  });

  const filterStart = 5 + Math.ceil(indicators.length / 2) * 2 + 1;
  overview.mergeCells(filterStart, 1, filterStart, 6);
  styleSectionTitle(overview.getCell(filterStart, 1), "FILTROS APLICADOS");
  filterRows(filter).forEach(([label, value], index) => {
    const row = filterStart + index + 1;
    overview.getCell(row, 1).value = label;
    overview.getCell(row, 1).font = { bold: true, color: { argb: SLATE } };
    overview.mergeCells(row, 2, row, 6);
    overview.getCell(row, 2).value = value;
    overview.getCell(row, 2).alignment = { wrapText: true };
  });
  overview.headerFooter.oddFooter =
    "&LSGR-EG | Uso interno&CReporte ejecutivo&R&P de &N";

  const risks = workbook.addWorksheet("Riesgos y matriz", {
    views: [{ state: "frozen", ySplit: 4, showGridLines: false }],
    pageSetup: {
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      paperSize: 9,
    },
  });
  risks.columns = [
    { width: 22 },
    { width: 14 },
    { width: 16 },
    { width: 4 },
    { width: 13 },
    { width: 13 },
    { width: 13 },
    { width: 13 },
    { width: 13 },
  ];
  risks.mergeCells("A1:I2");
  styleReportTitle(risks.getCell("A1"), "RIESGOS Y MATRIZ 5 × 5");
  risks.addRow([]);
  const distributionHeader = risks.addRow([
    "Nivel",
    "Cantidad",
    "Participación",
  ]);
  styleTableHeader(distributionHeader);
  summary.riskDistribution.forEach((item) => {
    const row = risks.addRow([
      item.level,
      item.count,
      item.percentage / 100,
    ]);
    row.getCell(3).numFmt = "0.0%";
    row.getCell(1).fill = solidFill(levelColor(item.level));
  });

  risks.getCell("E4").value = "Matriz de riesgos";
  risks.getCell("E4").font = { bold: true, color: { argb: NAVY }, size: 13 };
  ["Impacto 1", "Impacto 2", "Impacto 3", "Impacto 4", "Impacto 5"].forEach(
    (label, index) => {
      const cell = risks.getCell(5, 5 + index);
      cell.value = label;
      cell.font = { bold: true, color: { argb: WHITE }, size: 9 };
      cell.fill = solidFill(SLATE);
      cell.alignment = { horizontal: "center", vertical: "middle" };
    },
  );
  [5, 4, 3, 2, 1].forEach((probability, rowIndex) => {
    const row = 6 + rowIndex;
    risks.getCell(row, 4).value = `P${probability}`;
    risks.getCell(row, 4).font = { bold: true, color: { argb: SLATE } };
    [1, 2, 3, 4, 5].forEach((impact, columnIndex) => {
      const count =
        summary.heatmap.find(
          (cell) =>
            cell.probability === probability && cell.impact === impact,
        )?.count ?? 0;
      const cell = risks.getCell(row, 5 + columnIndex);
      cell.value = count;
      cell.fill = solidFill(
        matrixColor(probability * impact, summary.criticalityRanges),
      );
      cell.font = { bold: true, color: { argb: NAVY } };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = thinBorder();
    });
    risks.getRow(row).height = 30;
  });
  risks.headerFooter.oddFooter = "&LSGR-EG&CMapa de riesgos&R&P de &N";

  const management = workbook.addWorksheet("Gestión y seguimiento", {
    views: [{ showGridLines: false }],
    pageSetup: {
      orientation: "portrait",
      fitToPage: true,
      fitToWidth: 1,
      paperSize: 9,
    },
  });
  management.columns = [
    { width: 34 },
    { width: 18 },
    { width: 18 },
    { width: 18 },
  ];
  management.mergeCells("A1:D2");
  styleReportTitle(
    management.getCell("A1"),
    "GESTIÓN, CUMPLIMIENTO Y SEGUIMIENTO",
  );
  const sections: Array<{
    title: string;
    rows: Array<[string, string | number]>;
  }> = [
    {
      title: "Efectividad de controles",
      rows: [
        ["Alta", summary.controlEffectiveness.high],
        ["Media", summary.controlEffectiveness.medium],
        ["Baja", summary.controlEffectiveness.low],
      ],
    },
    {
      title: "Cumplimiento",
      rows: [
        ["Conformes", summary.compliance.compliant],
        ["No conformes", summary.compliance.nonCompliant],
        ["No aplicables", summary.compliance.notApplicable],
        ["Tasa de cumplimiento", `${summary.compliance.complianceRate.toFixed(1)}%`],
      ],
    },
    {
      title: "Hallazgos",
      rows: [
        ["Abiertos", summary.findings.open],
        ["En seguimiento", summary.findings.inProgress],
        ["Cerrados", summary.findings.closed],
        ["Vencidos", summary.findings.overdue],
      ],
    },
    {
      title: "Mitigación, alertas y auditoría",
      rows: [
        ["Avance de mitigación", `${summary.mitigationProgress.toFixed(1)}%`],
        ["Elementos vencidos", summary.overdueMitigationItems],
        ["Alertas activas", summary.activeAlerts],
        [
          "Atención promedio",
          summary.averageAlertAttentionHours === null
            ? "Sin datos"
            : `${summary.averageAlertAttentionHours.toFixed(1)} h`,
        ],
        [
          "Cobertura de auditoría",
          `${summary.auditCoverage.percentage.toFixed(1)}%`,
        ],
      ],
    },
  ];
  let nextRow = 4;
  for (const section of sections) {
    management.mergeCells(nextRow, 1, nextRow, 4);
    styleSectionTitle(management.getCell(nextRow, 1), section.title.toUpperCase());
    nextRow += 1;
    section.rows.forEach(([label, value]) => {
      management.getCell(nextRow, 1).value = label;
      management.getCell(nextRow, 1).font = { bold: true, color: { argb: SLATE } };
      management.mergeCells(nextRow, 2, nextRow, 4);
      management.getCell(nextRow, 2).value = value;
      management.getCell(nextRow, 2).font = { bold: true, color: { argb: BLUE } };
      nextRow += 1;
    });
    nextRow += 1;
  }
  management.headerFooter.oddFooter =
    "&LSGR-EG | Confidencial&CIndicadores de gestión&R&P de &N";

  const buffer = await workbook.xlsx.writeBuffer();
  return new Uint8Array(buffer);
}

export async function buildPdfReport(
  context: DashboardExportContext,
): Promise<Uint8Array> {
  const { filter, generatedAt, generatedBy, summary } = context;
  const pdf = await PDFDocument.create();
  pdf.setTitle("Reporte ejecutivo SGR-EG");
  pdf.setAuthor("SGR-EG");
  pdf.setCreator("Sistema de Gestión de Riesgos Empresariales Globales");
  pdf.setCreationDate(generatedAt);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const pages: PDFPage[] = [];
  const addPage = () => {
    const page = pdf.addPage([595.28, 841.89]);
    pages.push(page);
    return page;
  };

  let page = addPage();
  drawPdfHeader(page, bold, "REPORTE EJECUTIVO");
  page.drawText("Sistema de Gestión de Riesgos Empresariales Globales", {
    x: 42,
    y: 746,
    size: 11,
    font: regular,
    color: pdfColor(SLATE),
  });
  page.drawText(`Generado por: ${safePdfText(generatedBy)}`, {
    x: 42,
    y: 721,
    size: 9,
    font: regular,
    color: pdfColor(SLATE),
  });
  page.drawText(formatDateTime(generatedAt), {
    x: 390,
    y: 721,
    size: 9,
    font: regular,
    color: pdfColor(SLATE),
  });

  const cards: Array<[string, string, string]> = [
    ["Riesgos críticos", `${summary.criticalRisks} de ${summary.totalRisks}`, "FEE2E2"],
    ["Sobre apetito", String(summary.risksOverAppetite), "FFEDD5"],
    ["Cumplimiento", `${summary.compliance.complianceRate.toFixed(1)}%`, "DBEAFE"],
    [
      "Hallazgos abiertos",
      String(summary.findings.open + summary.findings.inProgress),
      "FEF3C7",
    ],
    ["Avance mitigación", `${summary.mitigationProgress.toFixed(1)}%`, "DCFCE7"],
    ["Alertas activas", String(summary.activeAlerts), "EDE9FE"],
    [
      "Cobertura auditoría",
      `${summary.auditCoverage.percentage.toFixed(1)}%`,
      "CCFBF1",
    ],
    ["Mitigaciones vencidas", String(summary.overdueMitigationItems), "FFE4E6"],
  ];
  cards.forEach(([label, value, color], index) => {
    const column = index % 2;
    const row = Math.floor(index / 2);
    const x = 42 + column * 260;
    const y = 665 - row * 70;
    page.drawRectangle({
      x,
      y,
      width: 244,
      height: 55,
      color: pdfColor(color),
      borderColor: pdfColor("CBD5E1"),
      borderWidth: 0.7,
    });
    page.drawText(label, {
      x: x + 12,
      y: y + 34,
      size: 9,
      font: regular,
      color: pdfColor(SLATE),
    });
    page.drawText(value, {
      x: x + 12,
      y: y + 12,
      size: 17,
      font: bold,
      color: pdfColor(NAVY),
    });
  });

  let y = 365;
  y = drawPdfSectionTitle(page, bold, "DISTRIBUCIÓN DE RIESGOS", y);
  const maximumRiskCount = Math.max(
    1,
    ...summary.riskDistribution.map(({ count }) => count),
  );
  summary.riskDistribution.forEach((item) => {
    page.drawText(item.level, {
      x: 42,
      y,
      size: 9,
      font: regular,
      color: pdfColor(SLATE),
    });
    page.drawRectangle({
      x: 135,
      y: y - 2,
      width: 310,
      height: 11,
      color: pdfColor(LIGHT_SLATE),
    });
    page.drawRectangle({
      x: 135,
      y: y - 2,
      width: (310 * item.count) / maximumRiskCount,
      height: 11,
      color: pdfColor(levelColor(item.level)),
    });
    page.drawText(`${item.count} (${item.percentage.toFixed(1)}%)`, {
      x: 455,
      y,
      size: 9,
      font: bold,
      color: pdfColor(NAVY),
    });
    y -= 26;
  });

  y -= 5;
  y = drawPdfSectionTitle(page, bold, "FILTROS APLICADOS", y);
  filterRows(filter).forEach(([label, value]) => {
    page.drawText(`${label}:`, {
      x: 42,
      y,
      size: 8.5,
      font: bold,
      color: pdfColor(SLATE),
    });
    page.drawText(safePdfText(String(value)), {
      x: 145,
      y,
      size: 8.5,
      font: regular,
      color: pdfColor(SLATE),
    });
    y -= 16;
  });

  page = addPage();
  drawPdfHeader(page, bold, "ANÁLISIS Y SEGUIMIENTO");
  y = 742;
  y = drawPdfSectionTitle(page, bold, "MATRIZ DE RIESGOS 5 × 5", y);
  const cellSize = 54;
  const matrixX = 145;
  const matrixTop = y - 12;
  [5, 4, 3, 2, 1].forEach((probability, rowIndex) => {
    page.drawText(`P${probability}`, {
      x: matrixX - 26,
      y: matrixTop - rowIndex * cellSize - 33,
      size: 9,
      font: bold,
      color: pdfColor(SLATE),
    });
    [1, 2, 3, 4, 5].forEach((impact, columnIndex) => {
      const x = matrixX + columnIndex * cellSize;
      const cellY = matrixTop - (rowIndex + 1) * cellSize;
      const count =
        summary.heatmap.find(
          (cell) =>
            cell.probability === probability && cell.impact === impact,
        )?.count ?? 0;
      page.drawRectangle({
        x,
        y: cellY,
        width: cellSize - 3,
        height: cellSize - 3,
        color: pdfColor(
          matrixColor(
            probability * impact,
            summary.criticalityRanges,
          ),
        ),
        borderColor: pdfColor(WHITE),
        borderWidth: 1,
      });
      page.drawText(String(count), {
        x: x + 21,
        y: cellY + 19,
        size: 12,
        font: bold,
        color: pdfColor(NAVY),
      });
    });
  });
  [1, 2, 3, 4, 5].forEach((impact, index) => {
    page.drawText(`I${impact}`, {
      x: matrixX + index * cellSize + 20,
      y: matrixTop - 5 * cellSize - 15,
      size: 9,
      font: bold,
      color: pdfColor(SLATE),
    });
  });
  y = matrixTop - 5 * cellSize - 52;
  y = drawPdfSectionTitle(page, bold, "GESTIÓN OPERATIVA", y);
  const operationalRows: Array<[string, string]> = [
    ["Controles con efectividad alta", String(summary.controlEffectiveness.high)],
    ["Controles con efectividad media", String(summary.controlEffectiveness.medium)],
    ["Controles con efectividad baja", String(summary.controlEffectiveness.low)],
    ["Hallazgos vencidos", String(summary.findings.overdue)],
    [
      "Tiempo medio de atención",
      summary.averageAlertAttentionHours === null
        ? "Sin datos"
        : `${summary.averageAlertAttentionHours.toFixed(1)} horas`,
    ],
    [
      "Unidades auditadas",
      `${summary.auditCoverage.auditedUnits} de ${summary.auditCoverage.plannedUnits}`,
    ],
  ];
  operationalRows.forEach(([label, value], index) => {
    const rowY = y - index * 25;
    page.drawRectangle({
      x: 42,
      y: rowY - 7,
      width: 510,
      height: 22,
      color: index % 2 === 0 ? pdfColor(LIGHT_SLATE) : pdfColor(WHITE),
    });
    page.drawText(label, {
      x: 50,
      y: rowY,
      size: 9,
      font: regular,
      color: pdfColor(SLATE),
    });
    page.drawText(value, {
      x: 450,
      y: rowY,
      size: 9,
      font: bold,
      color: pdfColor(BLUE),
    });
  });

  pages.forEach((currentPage, index) => {
    currentPage.drawLine({
      start: { x: 42, y: 30 },
      end: { x: 553, y: 30 },
      thickness: 0.5,
      color: pdfColor("CBD5E1"),
    });
    currentPage.drawText("SGR-EG | Documento de uso interno", {
      x: 42,
      y: 17,
      size: 7,
      font: regular,
      color: pdfColor(SLATE),
    });
    currentPage.drawText(`Página ${index + 1} de ${pages.length}`, {
      x: 488,
      y: 17,
      size: 7,
      font: regular,
      color: pdfColor(SLATE),
    });
  });

  return pdf.save();
}

function indicatorRows(
  summary: DashboardSummary,
): Array<[string, string | number | null]> {
  return [
    ["Riesgos activos", summary.totalRisks],
    ["Riesgos críticos", summary.criticalRisks],
    ["Riesgos sobre apetito", summary.risksOverAppetite],
    ["Mitigaciones vencidas", summary.overdueMitigationItems],
    ["Avance de mitigación", `${summary.mitigationProgress.toFixed(2)}%`],
    ["Cumplimiento", `${summary.compliance.complianceRate.toFixed(2)}%`],
    [
      "Hallazgos abiertos",
      summary.findings.open + summary.findings.inProgress,
    ],
    ["Alertas activas", summary.activeAlerts],
    [
      "Atención promedio",
      summary.averageAlertAttentionHours === null
        ? "Sin datos"
        : `${summary.averageAlertAttentionHours.toFixed(2)} h`,
    ],
    [
      "Cobertura de auditoría",
      `${summary.auditCoverage.percentage.toFixed(2)}%`,
    ],
  ];
}

function filterRows(
  filter: DashboardFilter,
): Array<[string, string]> {
  return [
    [
      "Alcance territorial",
      filter.countryId ? "País seleccionado" : "Todos los países autorizados",
    ],
    [
      "Unidad",
      filter.unitId ? "Unidad seleccionada" : "Todas las unidades autorizadas",
    ],
    [
      "Categoría",
      filter.categoryId ? "Categoría seleccionada" : "Todas las categorías",
    ],
    [
      "Responsable",
      filter.ownerId ? "Responsable seleccionado" : "Todos los responsables",
    ],
    [
      "Estado",
      filter.status
        ? filter.status.replaceAll("_", " ")
        : "Todos los estados",
    ],
    [
      "Periodo",
      `${filter.periodStart ? formatDate(filter.periodStart) : "Sin inicio"} - ${
        filter.periodEnd ? formatDate(filter.periodEnd) : "Sin fin"
      }`,
    ],
  ];
}

function csvCell(value: string | number | null): string {
  const text = value === null ? "" : String(value);
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safe.replaceAll('"', '""')}"`;
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("es-BO", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(date);
}

function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat("es-BO", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/La_Paz",
  }).format(date);
}

function solidFill(argb: string): SimpleXlsxFill {
  return {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb },
  };
}

function thinBorder(): Partial<SimpleXlsxBorders> {
  const border = { style: "thin" as const, color: { argb: "CBD5E1" } };
  return { top: border, left: border, bottom: border, right: border };
}

function styleReportTitle(cell: SimpleXlsxCell, value: string) {
  cell.value = value;
  cell.font = { bold: true, color: { argb: WHITE }, size: 18 };
  cell.fill = solidFill(NAVY);
  cell.alignment = { vertical: "middle", horizontal: "left" };
}

function styleSectionTitle(cell: SimpleXlsxCell, value: string) {
  cell.value = value;
  cell.font = { bold: true, color: { argb: WHITE }, size: 11 };
  cell.fill = solidFill(BLUE);
  cell.alignment = { vertical: "middle" };
}

function styleTableHeader(row: SimpleXlsxRow) {
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: WHITE } };
    cell.fill = solidFill(BLUE);
    cell.alignment = { horizontal: "center" };
    cell.border = thinBorder();
  });
}

function levelColor(level: string): string {
  const normalized = level.toLocaleLowerCase("es");
  if (normalized.includes("cr")) return "FCA5A5";
  if (normalized.includes("alto")) return "FDBA74";
  if (normalized.includes("moder")) return "FDE68A";
  return "86EFAC";
}

function matrixColor(
  value: number,
  ranges: DashboardSummary["criticalityRanges"],
): string {
  if (value <= ranges.low[1]) return "BBF7D0";
  if (value <= ranges.moderate[1]) return "FDE68A";
  if (value <= ranges.high[1]) return "FDBA74";
  return "FCA5A5";
}

function pdfColor(hex: string) {
  const normalized = hex.replace("#", "");
  return rgb(
    Number.parseInt(normalized.slice(0, 2), 16) / 255,
    Number.parseInt(normalized.slice(2, 4), 16) / 255,
    Number.parseInt(normalized.slice(4, 6), 16) / 255,
  );
}

function drawPdfHeader(page: PDFPage, font: PDFFont, title: string) {
  page.drawRectangle({
    x: 0,
    y: 775,
    width: 595.28,
    height: 66.89,
    color: pdfColor(NAVY),
  });
  page.drawText("SGR-EG", {
    x: 42,
    y: 807,
    size: 10,
    font,
    color: pdfColor("93C5FD"),
  });
  page.drawText(title, {
    x: 42,
    y: 786,
    size: 20,
    font,
    color: pdfColor(WHITE),
  });
}

function drawPdfSectionTitle(
  page: PDFPage,
  font: PDFFont,
  title: string,
  y: number,
): number {
  page.drawRectangle({
    x: 42,
    y: y - 4,
    width: 510,
    height: 22,
    color: pdfColor(BLUE),
  });
  page.drawText(title, {
    x: 50,
    y: y + 2,
    size: 9,
    font,
    color: pdfColor(WHITE),
  });
  return y - 30;
}

function safePdfText(value: string): string {
  return value
    .replaceAll("•", "-")
    .replaceAll("→", "->")
    .replaceAll("\u0000", "");
}
