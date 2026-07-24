import type { NextRequest } from "next/server";

import { errorResponse, successResponse } from "@/lib/http-response";
import { requirePermission } from "@/modules/auth/services/auth-guard.service";
import { RiskConfigurationService } from "@/modules/risks/services/risk-configuration.service";
import { createRiskCategorySchema } from "@/modules/risks/validators/risk-configuration.validator";

const riskConfigurationService = new RiskConfigurationService();

export async function GET(request: NextRequest) {
  try {
    await requirePermission(request, "organizacion", "read");
    const categories = await riskConfigurationService.listCategories();

    return successResponse(
      categories,
      "Categorías obtenidas correctamente.",
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
    const input = createRiskCategorySchema.parse(await request.json());
    const category = await riskConfigurationService.createCategory(
      input,
      principal.userId,
    );

    return successResponse(
      category,
      "Categoría creada correctamente.",
      201,
    );
  } catch (error) {
    return errorResponse(error);
  }
}
