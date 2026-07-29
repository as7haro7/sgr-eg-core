import type { NextRequest } from "next/server";

import { errorResponse, successResponse } from "@/lib/http-response";
import { AlertService } from "@/modules/alerts/services/alert.service";
import { requireAuthentication } from "@/modules/auth/services/auth-guard.service";

const alertService = new AlertService();

export async function GET(request: NextRequest) {
  try {
    const principal = await requireAuthentication(request);
    const count = await alertService.countUnread(principal);

    return successResponse(
      { count },
      "Contador de alertas obtenido correctamente.",
    );
  } catch (error) {
    return errorResponse(error);
  }
}
