import type { NextRequest } from "next/server";

import { errorResponse, successResponse } from "@/lib/http-response";
import { requireAuthentication } from "@/modules/auth/services/auth-guard.service";
import { EvaluationService } from "@/modules/compliance/services/evaluation.service";
import {
  evaluationIdSchema,
  updateEvaluationSchema,
} from "@/modules/compliance/validators/evaluation.validator";

const evaluationService = new EvaluationService();

interface RouteContext {
  params: Promise<{ evaluationId: string }>;
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const principal = await requireAuthentication(request);
    const evaluationId = evaluationIdSchema.parse(
      (await context.params).evaluationId,
    );
    const input = updateEvaluationSchema.parse(await request.json());
    const evaluation = await evaluationService.update(
      evaluationId,
      input,
      principal,
    );

    return successResponse(
      evaluation,
      "Evaluación actualizada correctamente.",
    );
  } catch (error) {
    return errorResponse(error);
  }
}

export async function GET(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const principal = await requireAuthentication(request);
    const evaluationId = evaluationIdSchema.parse(
      (await context.params).evaluationId,
    );
    const evaluation = await evaluationService.getById(
      evaluationId,
      principal,
    );

    return successResponse(
      evaluation,
      "Evaluación obtenida correctamente.",
    );
  } catch (error) {
    return errorResponse(error);
  }
}
