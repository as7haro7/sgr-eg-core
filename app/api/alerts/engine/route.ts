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
    
    // La ejecución manual es una operación administrativa de configuración.
    // La atención de alertas conserva su alcance propio/unidad.
    authService.assertAllowed(principal, "organizacion", "update");

    const result = await alertEngineService.runEngine();

    return successResponse(result, "Motor de alertas ejecutado correctamente.", 201);
  } catch (error) {
    return errorResponse(error);
  }
}
