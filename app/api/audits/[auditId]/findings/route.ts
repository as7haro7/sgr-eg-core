import type { NextRequest } from "next/server";

import { errorResponse, successResponse } from "@/lib/http-response";
import { requireAuthentication } from "@/modules/auth/services/auth-guard.service";
import { FindingService } from "@/modules/findings/services/finding.service";
import {
  auditFindingParamsSchema,
  createFindingSchema,
} from "@/modules/findings/validators/finding.validator";

const findingService = new FindingService();

interface RouteContext {
  params: Promise<{ auditId: string }>;
}

export async function GET(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const principal = await requireAuthentication(request);
    const { auditId } = auditFindingParamsSchema.parse(await context.params);
    const findings = await findingService.list(auditId, principal);

    return successResponse(
      findings,
      "Hallazgos obtenidos correctamente.",
    );
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const principal = await requireAuthentication(request);
    const { auditId } = auditFindingParamsSchema.parse(await context.params);
    const input = createFindingSchema.parse(await request.json());
    const finding = await findingService.create(
      auditId,
      input,
      principal,
    );

    return successResponse(
      finding,
      "Hallazgo registrado correctamente.",
      201,
    );
  } catch (error) {
    return errorResponse(error);
  }
}
