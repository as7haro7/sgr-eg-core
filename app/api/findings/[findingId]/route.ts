import type { NextRequest } from "next/server";

import { errorResponse, successResponse } from "@/lib/http-response";
import { requireAuthentication } from "@/modules/auth/services/auth-guard.service";
import { FindingService } from "@/modules/findings/services/finding.service";
import { findingParamsSchema, updateFindingSchema } from "@/modules/findings/validators/finding.validator";

const findingService = new FindingService();

interface RouteContext {
  params: Promise<{ findingId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const principal = await requireAuthentication(request);
    const { findingId } = findingParamsSchema.parse(await params);
    const finding = await findingService.getById(findingId, principal);

    return successResponse(finding, "Hallazgo obtenido correctamente.");
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
  try {
    const principal = await requireAuthentication(request);
    const { findingId } = findingParamsSchema.parse(await params);
    const input = updateFindingSchema.parse(await request.json());
    
    const finding = await findingService.update(findingId, input, principal);

    return successResponse(finding, "Hallazgo actualizado correctamente.");
  } catch (error) {
    return errorResponse(error);
  }
}
