import type { NextRequest } from "next/server";

import { errorResponse, successResponse } from "@/lib/http-response";
import { requirePermission } from "@/modules/auth/services/auth-guard.service";
import { RiskConfigurationService } from "@/modules/risks/services/risk-configuration.service";
import {
  riskCategoryIdSchema,
  updateRiskCategorySchema,
} from "@/modules/risks/validators/risk-configuration.validator";

const riskConfigurationService = new RiskConfigurationService();

interface RouteContext {
  params: Promise<{ categoryId: string }>;
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
    const categoryId = riskCategoryIdSchema.parse(
      (await context.params).categoryId,
    );
    const input = updateRiskCategorySchema.parse(await request.json());
    const category = await riskConfigurationService.updateCategory(
      categoryId,
      input,
      principal.userId,
    );

    return successResponse(
      category,
      "Categoría actualizada correctamente.",
    );
  } catch (error) {
    return errorResponse(error);
  }
}
