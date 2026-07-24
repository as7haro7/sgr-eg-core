import type { NextRequest } from "next/server";

import { errorResponse, successResponse } from "@/lib/http-response";
import { requireAuthentication } from "@/modules/auth/services/auth-guard.service";
import { RiskService } from "@/modules/risks/services/risk.service";
import {
  riskIdSchema,
  updateRiskSchema,
} from "@/modules/risks/validators/risk.validator";

const riskService = new RiskService();

interface RouteContext {
  params: Promise<{ riskId: string }>;
}

export async function GET(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const principal = await requireAuthentication(request);
    const riskId = riskIdSchema.parse((await context.params).riskId);
    const risk = await riskService.getById(riskId, principal);

    return successResponse(risk, "Riesgo obtenido correctamente.");
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const principal = await requireAuthentication(request);
    const riskId = riskIdSchema.parse((await context.params).riskId);
    const input = updateRiskSchema.parse(await request.json());
    const risk = await riskService.update(riskId, input, principal);

    return successResponse(risk, "Riesgo actualizado correctamente.");
  } catch (error) {
    return errorResponse(error);
  }
}
