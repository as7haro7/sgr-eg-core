import type { NextRequest } from "next/server";

import { errorResponse, successResponse } from "@/lib/http-response";
import { requirePermission } from "@/modules/auth/services/auth-guard.service";
import { SystemParameterService } from "@/modules/shared/services/system-parameter.service";
import {
  systemParameterKeySchema,
  updateSystemParameterSchema,
} from "@/modules/shared/validators/system-parameter.validator";

const systemParameterService = new SystemParameterService();

interface RouteContext {
  params: Promise<{ key: string }>;
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const principal = await requirePermission(
      request,
      "organizacion",
      "update",
    );
    const key = systemParameterKeySchema.parse(
      decodeURIComponent((await context.params).key),
    );
    const input = updateSystemParameterSchema.parse(await request.json());
    const parameter = await systemParameterService.update(
      key,
      input,
      principal.userId,
    );

    return successResponse(
      parameter,
      "Parámetro actualizado correctamente.",
    );
  } catch (error) {
    return errorResponse(error);
  }
}
