import type { NextRequest } from "next/server";

import { errorResponse, successResponse } from "@/lib/http-response";
import { requirePermission } from "@/modules/auth/services/auth-guard.service";
import { CountryService } from "@/modules/business-units/services/country.service";
import { countryIdSchema } from "@/modules/business-units/validators/organization.validator";

const countryService = new CountryService();

interface RouteContext {
  params: Promise<{ countryId: string }>;
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
    const countryId = countryIdSchema.parse(
      (await context.params).countryId,
    );

    await countryService.deactivate(countryId, principal.userId);

    return successResponse(null, "País desactivado correctamente.");
  } catch (error) {
    return errorResponse(error);
  }
}
