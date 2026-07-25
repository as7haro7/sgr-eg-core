import type { NextRequest } from "next/server";

import { errorResponse, successResponse } from "@/lib/http-response";
import { requireAuthentication } from "@/modules/auth/services/auth-guard.service";
import { ControlService } from "@/modules/controls/services/control.service";
import { createControlSchema } from "@/modules/controls/validators/control.validator";
import { riskIdSchema } from "@/modules/risks/validators/risk.validator";

const controlService = new ControlService();
interface RouteContext { params: Promise<{ riskId: string }> }

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const principal = await requireAuthentication(request);
    const riskId = riskIdSchema.parse((await context.params).riskId);
    const overview = await controlService.getOverview(riskId, principal);
    return successResponse(overview, "Controles obtenidos correctamente.");
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const principal = await requireAuthentication(request);
    const riskId = riskIdSchema.parse((await context.params).riskId);
    const input = createControlSchema.parse(await request.json());
    const overview = await controlService.create(riskId, input, principal);
    return successResponse(overview, "Control creado correctamente.", 201);
  } catch (error) {
    return errorResponse(error);
  }
}
