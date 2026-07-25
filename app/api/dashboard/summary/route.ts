import type { NextRequest } from "next/server";

import { errorResponse, successResponse } from "@/lib/http-response";
import { requireAuthentication } from "@/modules/auth/services/auth-guard.service";
import { DashboardService } from "@/modules/dashboard/services/dashboard.service";
import { dashboardFilterSchema } from "@/modules/dashboard/validators/dashboard.validator";

const dashboardService = new DashboardService();

export async function GET(request: NextRequest) {
  try {
    const principal = await requireAuthentication(request);
    const query = dashboardFilterSchema.parse(
      Object.fromEntries(request.nextUrl.searchParams),
    );
    const summary = await dashboardService.getSummary(query, principal);

    return successResponse(summary, "Dashboard obtenido correctamente.");
  } catch (error) {
    return errorResponse(error);
  }
}
