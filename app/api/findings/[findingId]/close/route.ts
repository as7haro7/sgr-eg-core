import type { NextRequest } from "next/server";

import { errorResponse, successResponse } from "@/lib/http-response";
import { requireAuthentication } from "@/modules/auth/services/auth-guard.service";
import { FindingService } from "@/modules/findings/services/finding.service";
import { findingParamsSchema } from "@/modules/findings/validators/finding.validator";

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
    const finding = await findingService.close(findingId, principal);

    return successResponse(finding, "Hallazgo cerrado correctamente.");
  } catch (error) {
    return errorResponse(error);
  }
}
