import type { NextRequest } from "next/server";

import { errorResponse, successResponse } from "@/lib/http-response";
import { requirePermission } from "@/modules/auth/services/auth-guard.service";
import { CountryService } from "@/modules/business-units/services/country.service";
import {
  countryIdSchema,
  updateCountrySchema,
} from "@/modules/business-units/validators/organization.validator";

const countryService = new CountryService();

interface RouteContext {
  params: Promise<{ countryId: string }>;
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
    const countryId = countryIdSchema.parse(
      (await context.params).countryId,
    );
    const input = updateCountrySchema.parse(await request.json());
    const country = await countryService.update(
      countryId,
      input,
      principal.userId,
    );

    return successResponse(country, "País actualizado correctamente.");
  } catch (error) {
    return errorResponse(error);
  }
}
