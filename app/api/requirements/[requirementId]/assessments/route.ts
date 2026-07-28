import type { NextRequest } from "next/server";

import { errorResponse, successResponse } from "@/lib/http-response";
import { requireAuthentication } from "@/modules/auth/services/auth-guard.service";
import { EvaluationService } from "@/modules/compliance/services/evaluation.service";
import { createEvaluationSchema } from "@/modules/compliance/validators/evaluation.validator";
import { requirementIdSchema } from "@/modules/regulations/validators/regulation.validator";

const evaluationService = new EvaluationService();

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ requirementId: string }> },
) {
  try {
    const principal = await requireAuthentication(request);
    const requirementId = requirementIdSchema.parse(
      (await context.params).requirementId,
    );
    const body = (await request.json()) as Record<string, unknown>;
    const input = createEvaluationSchema.parse({
      ...body,
      requirementId,
    });
    const evaluation = await evaluationService.create(input, principal);

    return successResponse(
      evaluation,
      "Evaluación registrada correctamente.",
      201,
    );
  } catch (error) {
    return errorResponse(error);
  }
}
