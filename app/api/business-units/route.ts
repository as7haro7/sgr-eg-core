import type { NextRequest } from "next/server";

import { errorResponse, successResponse } from "@/lib/http-response";
import { requirePermission } from "@/modules/auth/services/auth-guard.service";
import { BusinessUnitService } from "@/modules/business-units/services/business-unit.service";
import { createBusinessUnitSchema } from "@/modules/business-units/validators/organization.validator";

const businessUnitService = new BusinessUnitService();

export async function GET(request: NextRequest) {
  try {
    await requirePermission(request, "usuarios", "read");
    const units = await businessUnitService.listActive();

    return successResponse(
      units,
      "Unidades de negocio obtenidas correctamente.",
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
    const input = createBusinessUnitSchema.parse(await request.json());
    const unit = await businessUnitService.create(
      input,
      principal.userId,
    );

    return successResponse(
      unit,
      "Unidad de negocio creada correctamente.",
      201,
    );
  } catch (error) {
    return errorResponse(error);
  }
}
