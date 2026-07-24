import type { NextRequest } from "next/server";

import { errorResponse, successResponse } from "@/lib/http-response";
import { requirePermission } from "@/modules/auth/services/auth-guard.service";
import { CountryService } from "@/modules/business-units/services/country.service";
import { createCountrySchema } from "@/modules/business-units/validators/organization.validator";

const countryService = new CountryService();

export async function GET(request: NextRequest) {
  try {
    await requirePermission(request, "organizacion", "read");
    const countries = await countryService.list();

    return successResponse(countries, "Países obtenidos correctamente.");
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
    const input = createCountrySchema.parse(await request.json());
    const country = await countryService.create(input, principal.userId);

    return successResponse(country, "País creado correctamente.", 201);
  } catch (error) {
    return errorResponse(error);
  }
}
