import type { NextRequest } from "next/server";

import { errorResponse, successResponse } from "@/lib/http-response";
import { requireAuthentication } from "@/modules/auth/services/auth-guard.service";
import { AlertEngineService } from "@/modules/alerts/services/alert-engine.service";
import { AuthorizationService } from "@/modules/auth/services/authorization.service";

const alertEngineService = new AlertEngineService();
const authService = new AuthorizationService();

export async function POST(request: NextRequest) {
  try {
    const principal = await requireAuthentication(request);
    
    // Only users with write access to configuration or global scope can trigger the engine manually
    authService.assertAllowed(principal, "alertas", "update");

    const result = await alertEngineService.runEngine();

    return successResponse(result, "Motor de alertas ejecutado correctamente.", 201);
  } catch (error) {
    return errorResponse(error);
  }
}
