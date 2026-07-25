import type { NextRequest } from "next/server";

import { errorResponse, successResponse } from "@/lib/http-response";
import { requireAuthentication } from "@/modules/auth/services/auth-guard.service";
import { AlertService } from "@/modules/alerts/services/alert.service";
import { alertIdSchema, attendAlertSchema } from "@/modules/alerts/validators/alert.validator";

const alertService = new AlertService();

interface RouteContext {
  params: Promise<{ alertId: string }>;
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const principal = await requireAuthentication(request);
    const { alertId } = alertIdSchema
      .transform((id) => ({ alertId: id }))
      .parse((await params).alertId);
      
    const input = attendAlertSchema.parse(await request.json());
    const alert = await alertService.reopen(alertId, input, principal);

    return successResponse(alert, "Alerta reabierta correctamente.");
  } catch (error) {
    return errorResponse(error);
  }
}
