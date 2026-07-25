import type { NextRequest } from "next/server";

import { errorResponse, successResponse } from "@/lib/http-response";
import { requireAuthentication } from "@/modules/auth/services/auth-guard.service";
import { ControlService } from "@/modules/controls/services/control.service";
import {
  controlIdSchema,
  updateControlSchema,
} from "@/modules/controls/validators/control.validator";

const controlService = new ControlService();
interface RouteContext { params: Promise<{ controlId: string }> }

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const principal = await requireAuthentication(request);
    const controlId = controlIdSchema.parse((await context.params).controlId);
    const input = updateControlSchema.parse(await request.json());
    const overview = await controlService.update(controlId, input, principal);
    return successResponse(overview, "Control actualizado correctamente.");
  } catch (error) {
    return errorResponse(error);
  }
}
