import type { NextRequest } from "next/server";

import { errorResponse, successResponse } from "@/lib/http-response";
import { requirePermission } from "@/modules/auth/services/auth-guard.service";
import { BusinessUnitService } from "@/modules/business-units/services/business-unit.service";
import { businessUnitIdSchema } from "@/modules/business-units/validators/organization.validator";

const businessUnitService = new BusinessUnitService();

interface RouteContext {
  params: Promise<{ unitId: string }>;
}

export async function POST(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const principal = await requirePermission(
      request,
      "organizacion",
      "deactivate",
    );
    const unitId = businessUnitIdSchema.parse(
      (await context.params).unitId,
    );

    await businessUnitService.deactivate(unitId, principal.userId);

    return successResponse(
      null,
      "Unidad de negocio desactivada correctamente.",
    );
  } catch (error) {
    return errorResponse(error);
  }
}
