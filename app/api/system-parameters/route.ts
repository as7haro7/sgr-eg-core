import type { NextRequest } from "next/server";

import { errorResponse, successResponse } from "@/lib/http-response";
import { requirePermission } from "@/modules/auth/services/auth-guard.service";
import { SystemParameterService } from "@/modules/shared/services/system-parameter.service";
import { createSystemParameterSchema } from "@/modules/shared/validators/system-parameter.validator";

const systemParameterService = new SystemParameterService();

export async function GET(request: NextRequest) {
  try {
    await requirePermission(request, "organizacion", "read");
    const parameters = await systemParameterService.list();

    return successResponse(
      parameters,
      "Parámetros obtenidos correctamente.",
    );
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const principal = await requirePermission(
      request,
      "organizacion",
      "create",
    );
    const input = createSystemParameterSchema.parse(await request.json());
    const parameter = await systemParameterService.create(
      input,
      principal.userId,
    );

    return successResponse(
      parameter,
      "Parámetro creado correctamente.",
      201,
    );
  } catch (error) {
    return errorResponse(error);
  }
}
