import type { NextRequest } from "next/server";

import { errorResponse, successResponse } from "@/lib/http-response";
import { requirePermission } from "@/modules/auth/services/auth-guard.service";
import { BusinessUnitService } from "@/modules/business-units/services/business-unit.service";
import {
  businessUnitIdSchema,
  updateBusinessUnitSchema,
} from "@/modules/business-units/validators/organization.validator";

const businessUnitService = new BusinessUnitService();

interface RouteContext {
  params: Promise<{ unitId: string }>;
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
    const unitId = businessUnitIdSchema.parse(
      (await context.params).unitId,
    );
    const input = updateBusinessUnitSchema.parse(await request.json());
    const unit = await businessUnitService.update(
      unitId,
      input,
      principal.userId,
    );

    return successResponse(
      unit,
      "Unidad de negocio actualizada correctamente.",
    );
  } catch (error) {
    return errorResponse(error);
  }
}
