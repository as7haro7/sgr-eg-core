import type { NextRequest } from "next/server";

import { errorResponse, successResponse } from "@/lib/http-response";
import { requireAuthentication } from "@/modules/auth/services/auth-guard.service";
import { RegulationService } from "@/modules/regulations/services/regulation.service";
import {
  regulationIdSchema,
  requirementIdSchema,
  updateRequirementSchema,
} from "@/modules/regulations/validators/regulation.validator";
import { z } from "zod";

const regulationService = new RegulationService();

interface RouteContext {
  params: Promise<{ regulationId: string; requirementId: string }>;
}

const routeParamsSchema = z.object({
  regulationId: regulationIdSchema,
  requirementId: requirementIdSchema,
});

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const principal = await requireAuthentication(request);
    const { regulationId, requirementId } = routeParamsSchema.parse(
      await params,
    );
    const requirement = await regulationService.getRequirementById(
      regulationId,
      requirementId,
      principal,
    );

    return successResponse(requirement, "Requisito obtenido correctamente.");
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
  try {
    const principal = await requireAuthentication(request);
    const { regulationId, requirementId } = routeParamsSchema.parse(
      await params,
    );
    const input = updateRequirementSchema.parse(await request.json());
    const requirement = await regulationService.updateRequirement(
      regulationId,
      requirementId,
      input,
      principal,
    );

    return successResponse(requirement, "Requisito actualizado correctamente.");
  } catch (error) {
    return errorResponse(error);
  }
}
