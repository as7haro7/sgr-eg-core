import type { NextRequest } from "next/server";

import { errorResponse, successResponse } from "@/lib/http-response";
import { requireAuthentication } from "@/modules/auth/services/auth-guard.service";
import { RiskService } from "@/modules/risks/services/risk.service";
import {
  riskIdSchema,
  updateRiskSchema,
} from "@/modules/risks/validators/risk.validator";

const riskService = new RiskService();

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ riskId: string }> },
) {
  try {
    const principal = await requireAuthentication(request);
    const riskId = riskIdSchema.parse((await context.params).riskId);
    const input = updateRiskSchema.parse(await request.json());
    const risk = await riskService.update(riskId, input, principal);

    return successResponse(
      risk,
      "Evaluación del riesgo guardada correctamente.",
    );
  } catch (error) {
    return errorResponse(error);
  }
}
