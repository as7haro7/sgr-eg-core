import type { NextRequest } from "next/server";

import { errorResponse, successResponse } from "@/lib/http-response";
import { requireAuthentication } from "@/modules/auth/services/auth-guard.service";
import { RiskService } from "@/modules/risks/services/risk.service";
import { previewRiskSchema } from "@/modules/risks/validators/risk.validator";

const riskService = new RiskService();

export async function POST(request: NextRequest) {
  try {
    const principal = await requireAuthentication(request);
    const input = previewRiskSchema.parse(await request.json());
    const preview = await riskService.previewCalculation(input, principal);

    return successResponse(
      preview,
      "Cálculo de riesgo previsualizado correctamente.",
    );
  } catch (error) {
    return errorResponse(error);
  }
}
