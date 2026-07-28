import type { NextRequest } from "next/server";

import { errorResponse, successResponse } from "@/lib/http-response";
import { requireAuthentication } from "@/modules/auth/services/auth-guard.service";
import { AlertService } from "@/modules/alerts/services/alert.service";
import {
  listAlertsQuerySchema,
  patchAlertSchema,
} from "@/modules/alerts/validators/alert.validator";

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

export async function PATCH(request: NextRequest) {
  try {
    const principal = await requireAuthentication(request);
    const input = patchAlertSchema.parse(await request.json());
    const alert = await alertService.attend(
      input.alertId,
      { comment: input.comment },
      principal,
    );

    return successResponse(alert, "Alerta atendida correctamente.");
  } catch (error) {
    return errorResponse(error);
  }
}
