import type { NextRequest } from "next/server";

import { errorResponse, successResponse } from "@/lib/http-response";
import { requireAuthentication } from "@/modules/auth/services/auth-guard.service";
import { MitigationService } from "@/modules/mitigation/services/mitigation.service";
import {
  createMitigationActionSchema,
  mitigationPlanIdSchema,
} from "@/modules/mitigation/validators/mitigation.validator";

const mitigationService = new MitigationService();
interface RouteContext { params: Promise<{ planId: string }> }

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const principal = await requireAuthentication(request);
    const planId = mitigationPlanIdSchema.parse((await context.params).planId);
    const input = createMitigationActionSchema.parse(await request.json());
    const plans = await mitigationService.createAction(planId, input, principal);
    return successResponse(plans, "Acción creada correctamente.", 201);
  } catch (error) {
    return errorResponse(error);
  }
}
