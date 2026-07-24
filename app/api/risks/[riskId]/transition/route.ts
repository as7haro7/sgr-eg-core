import type { NextRequest } from "next/server";

import { errorResponse, successResponse } from "@/lib/http-response";
import { requireAuthentication } from "@/modules/auth/services/auth-guard.service";
import { RiskService } from "@/modules/risks/services/risk.service";
import {
  riskIdSchema,
  transitionRiskSchema,
} from "@/modules/risks/validators/risk.validator";

const riskService = new RiskService();

interface RouteContext {
  params: Promise<{ riskId: string }>;
}

export async function POST(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const principal = await requireAuthentication(request);
    const riskId = riskIdSchema.parse((await context.params).riskId);
    const input = transitionRiskSchema.parse(await request.json());
    const risk = await riskService.transition(riskId, input, principal);

    return successResponse(
      risk,
      "Estado del riesgo actualizado correctamente.",
    );
  } catch (error) {
    return errorResponse(error);
  }
}
