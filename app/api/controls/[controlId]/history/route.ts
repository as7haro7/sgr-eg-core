import type { NextRequest } from "next/server";

import { errorResponse, successResponse } from "@/lib/http-response";
import { requireAuthentication } from "@/modules/auth/services/auth-guard.service";
import { ControlService } from "@/modules/controls/services/control.service";
import { controlIdSchema } from "@/modules/controls/validators/control.validator";

const controlService = new ControlService();
interface RouteContext { params: Promise<{ controlId: string }> }

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const principal = await requireAuthentication(request);
    const controlId = controlIdSchema.parse((await context.params).controlId);
    const history = await controlService.getHistory(controlId, principal);
    return successResponse(history, "Historial obtenido correctamente.");
  } catch (error) {
    return errorResponse(error);
  }
}
