import type { NextRequest } from "next/server";

import { errorResponse, successResponse } from "@/lib/http-response";
import { requireAuthentication } from "@/modules/auth/services/auth-guard.service";
import { FindingService } from "@/modules/findings/services/finding.service";
import {
  findingParamsSchema,
  respondFindingSchema,
} from "@/modules/findings/validators/finding.validator";

const findingService = new FindingService();

interface RouteContext {
  params: Promise<{ findingId: string }>;
}

export async function POST(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const principal = await requireAuthentication(request);
    const { findingId } = findingParamsSchema.parse(await context.params);
    const input = respondFindingSchema.parse(await request.json());
    const finding = await findingService.respond(
      findingId,
      input,
      principal,
    );

    return successResponse(
      finding,
      "Respuesta registrada y hallazgo puesto en seguimiento.",
    );
  } catch (error) {
    return errorResponse(error);
  }
}
