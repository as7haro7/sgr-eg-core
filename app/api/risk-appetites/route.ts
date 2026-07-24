import type { NextRequest } from "next/server";

import { errorResponse, successResponse } from "@/lib/http-response";
import { requirePermission } from "@/modules/auth/services/auth-guard.service";
import { RiskConfigurationService } from "@/modules/risks/services/risk-configuration.service";
import { createRiskAppetiteSchema } from "@/modules/risks/validators/risk-configuration.validator";

const riskConfigurationService = new RiskConfigurationService();

export async function GET(request: NextRequest) {
  try {
    await requirePermission(request, "organizacion", "read");
    const appetites = await riskConfigurationService.listAppetites();

    return successResponse(
      appetites,
      "Historial de apetito obtenido correctamente.",
    );
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const principal = await requirePermission(
      request,
      "organizacion",
      "create",
    );
    const input = createRiskAppetiteSchema.parse(await request.json());
    const appetite = await riskConfigurationService.createAppetite(
      input,
      principal.userId,
    );

    return successResponse(
      appetite,
      "Configuración de apetito creada correctamente.",
      201,
    );
  } catch (error) {
    return errorResponse(error);
  }
}
