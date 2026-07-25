import type { NextRequest } from "next/server";

import { errorResponse, successResponse } from "@/lib/http-response";
import { requireAuthentication } from "@/modules/auth/services/auth-guard.service";
import { RegulationService } from "@/modules/regulations/services/regulation.service";
import {
  createRequirementSchema,
  listRequirementsQuerySchema,
  regulationIdSchema,
} from "@/modules/regulations/validators/regulation.validator";

const regulationService = new RegulationService();

interface RouteContext {
  params: Promise<{ regulationId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const principal = await requireAuthentication(request);
    const { regulationId } = regulationIdSchema
      .transform((id) => ({ regulationId: id }))
      .parse((await params).regulationId);
      
    const query = listRequirementsQuerySchema.parse(
      Object.fromEntries(request.nextUrl.searchParams),
    );
    const requirements = await regulationService.listRequirements(
      regulationId,
      query,
      principal,
    );

    return successResponse(requirements, "Requisitos obtenidos correctamente.");
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const principal = await requireAuthentication(request);
    const { regulationId } = regulationIdSchema
      .transform((id) => ({ regulationId: id }))
      .parse((await params).regulationId);
      
    const input = createRequirementSchema.parse(await request.json());
    const requirement = await regulationService.createRequirement(
      regulationId,
      input,
      principal,
    );

    return successResponse(requirement, "Requisito creado correctamente.", 201);
  } catch (error) {
    return errorResponse(error);
  }
}
