import type { NextRequest } from "next/server";

import { errorResponse, successResponse } from "@/lib/http-response";
import { requireAuthentication } from "@/modules/auth/services/auth-guard.service";
import { MitigationService } from "@/modules/mitigation/services/mitigation.service";
import { createMitigationPlanSchema } from "@/modules/mitigation/validators/mitigation.validator";
import { riskIdSchema } from "@/modules/risks/validators/risk.validator";

const mitigationService = new MitigationService();

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ riskId: string }> },
) {
  try {
    const principal = await requireAuthentication(request);
    const riskId = riskIdSchema.parse((await context.params).riskId);
    const plans = await mitigationService.listByRisk(riskId, principal);
    return successResponse(plans, "Planes obtenidos correctamente.");
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ riskId: string }> },
) {
  try {
    const principal = await requireAuthentication(request);
    const riskId = riskIdSchema.parse((await context.params).riskId);
    const input = createMitigationPlanSchema.parse(await request.json());
    const plans = await mitigationService.createPlan(
      riskId,
      input,
      principal,
    );
    return successResponse(plans, "Plan creado correctamente.", 201);
  } catch (error) {
    return errorResponse(error);
  }
}
