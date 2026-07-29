import type { NextRequest } from "next/server";

import { errorResponse } from "@/lib/http-response";
import { requireAuthentication } from "@/modules/auth/services/auth-guard.service";
import {
  buildCsvReport,
  buildExcelReport,
  buildPdfReport,
} from "@/modules/dashboard/services/dashboard-export.service";
import { DashboardService } from "@/modules/dashboard/services/dashboard.service";
import {
  dashboardExportFormatSchema,
  dashboardFilterSchema,
} from "@/modules/dashboard/validators/dashboard.validator";

const dashboardService = new DashboardService();

export async function GET(request: NextRequest) {
  try {
    const principal = await requireAuthentication(request);
    const params = Object.fromEntries(request.nextUrl.searchParams);
    const format = dashboardExportFormatSchema.parse(params.format);
    const filter = dashboardFilterSchema.parse(params);
    const summary = await dashboardService.getSummary(filter, principal);
    const generatedAt = new Date();
    const context = {
      filter,
      generatedAt,
      generatedBy: principal.name,
      summary,
    };
    const date = generatedAt.toISOString().slice(0, 10);
    const response =
      format === "xlsx"
        ? {
            body: toArrayBuffer(await buildExcelReport(context)),
            contentType:
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          }
        : format === "pdf"
          ? {
              body: toArrayBuffer(await buildPdfReport(context)),
              contentType: "application/pdf",
            }
          : {
              body: buildCsvReport(context),
              contentType: "text/csv; charset=utf-8",
            };

    return new Response(response.body, {
      status: 200,
      headers: {
        "content-type": response.contentType,
        "content-disposition": `attachment; filename="sgr-eg-reporte-${date}.${format}"`,
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}
