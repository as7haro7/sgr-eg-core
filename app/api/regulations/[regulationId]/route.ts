import type { NextRequest } from "next/server";

import { errorResponse, successResponse } from "@/lib/http-response";
import { requireAuthentication } from "@/modules/auth/services/auth-guard.service";
import { RegulationService } from "@/modules/regulations/services/regulation.service";
import {
  regulationIdSchema,
  updateRegulationSchema,
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
    const regulation = await regulationService.getRegulationById(
      regulationId,
      principal,
    );

    return successResponse(regulation, "Normativa obtenida correctamente.");
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
  try {
    const principal = await requireAuthentication(request);
    const { regulationId } = regulationIdSchema
      .transform((id) => ({ regulationId: id }))
      .parse((await params).regulationId);
    const input = updateRegulationSchema.parse(await request.json());
    const regulation = await regulationService.updateRegulation(
      regulationId,
      input,
      principal,
    );

    return successResponse(regulation, "Normativa actualizada correctamente.");
  } catch (error) {
    return errorResponse(error);
  }
}
