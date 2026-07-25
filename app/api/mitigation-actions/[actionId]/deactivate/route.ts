import type { NextRequest } from "next/server";

import { errorResponse, successResponse } from "@/lib/http-response";
import { requireAuthentication } from "@/modules/auth/services/auth-guard.service";
import { MitigationService } from "@/modules/mitigation/services/mitigation.service";
import { mitigationActionIdSchema } from "@/modules/mitigation/validators/mitigation.validator";

const mitigationService = new MitigationService();
interface RouteContext { params: Promise<{ actionId: string }> }

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const principal = await requireAuthentication(request);
    const actionId = mitigationActionIdSchema.parse((await context.params).actionId);
    const plans = await mitigationService.deactivateAction(actionId, principal);
    return successResponse(plans, "Acción desactivada correctamente.");
  } catch (error) {
    return errorResponse(error);
  }
}
