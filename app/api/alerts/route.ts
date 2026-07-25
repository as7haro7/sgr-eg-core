import type { NextRequest } from "next/server";

import { errorResponse, successResponse } from "@/lib/http-response";
import { requireAuthentication } from "@/modules/auth/services/auth-guard.service";
import { AlertService } from "@/modules/alerts/services/alert.service";
import { listAlertsQuerySchema } from "@/modules/alerts/validators/alert.validator";

const alertService = new AlertService();

export async function GET(request: NextRequest) {
  try {
    const principal = await requireAuthentication(request);
    const query = listAlertsQuerySchema.parse(
      Object.fromEntries(request.nextUrl.searchParams),
    );
    const alerts = await alertService.list(query, principal);

    return successResponse(alerts, "Alertas obtenidas correctamente.");
  } catch (error) {
    return errorResponse(error);
  }
}
