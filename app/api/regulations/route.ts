import type { NextRequest } from "next/server";

import { errorResponse, successResponse } from "@/lib/http-response";
import { requireAuthentication } from "@/modules/auth/services/auth-guard.service";
import { RegulationService } from "@/modules/regulations/services/regulation.service";
import {
  createRegulationSchema,
  listRegulationsQuerySchema,
} from "@/modules/regulations/validators/regulation.validator";

const regulationService = new RegulationService();

export async function GET(request: NextRequest) {
  try {
    const principal = await requireAuthentication(request);
    const query = listRegulationsQuerySchema.parse(
      Object.fromEntries(request.nextUrl.searchParams),
    );
    const regulations = await regulationService.listRegulations(query, principal);

    return successResponse(regulations, "Normativas obtenidas correctamente.");
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const principal = await requireAuthentication(request);
    const input = createRegulationSchema.parse(await request.json());
    const regulation = await regulationService.createRegulation(input, principal);

    return successResponse(regulation, "Normativa creada correctamente.", 201);
  } catch (error) {
    return errorResponse(error);
  }
}
