import type { NextRequest } from "next/server";

import { errorResponse, successResponse } from "@/lib/http-response";
import { requirePermission } from "@/modules/auth/services/auth-guard.service";
import { RiskConfigurationService } from "@/modules/risks/services/risk-configuration.service";
import { riskCategoryIdSchema } from "@/modules/risks/validators/risk-configuration.validator";

const riskConfigurationService = new RiskConfigurationService();

interface RouteContext {
  params: Promise<{ categoryId: string }>;
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
    const categoryId = riskCategoryIdSchema.parse(
      (await context.params).categoryId,
    );
    await riskConfigurationService.deactivateCategory(
      categoryId,
      principal.userId,
    );

    return successResponse(null, "Categoría desactivada correctamente.");
  } catch (error) {
    return errorResponse(error);
  }
}
