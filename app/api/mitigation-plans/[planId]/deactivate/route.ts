import type { NextRequest } from "next/server";

import { errorResponse, successResponse } from "@/lib/http-response";
import { requireAuthentication } from "@/modules/auth/services/auth-guard.service";
import { MitigationService } from "@/modules/mitigation/services/mitigation.service";
import { mitigationPlanIdSchema } from "@/modules/mitigation/validators/mitigation.validator";

const mitigationService = new MitigationService();
interface RouteContext { params: Promise<{ planId: string }> }

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const principal = await requireAuthentication(request);
    const planId = mitigationPlanIdSchema.parse((await context.params).planId);
    const plans = await mitigationService.deactivatePlan(planId, principal);
    return successResponse(plans, "Plan desactivado correctamente.");
  } catch (error) {
    return errorResponse(error);
  }
}
