import type { NextRequest } from "next/server";

import { errorResponse, successResponse } from "@/lib/http-response";
import { requireAuthentication } from "@/modules/auth/services/auth-guard.service";
import { EvaluationService } from "@/modules/compliance/services/evaluation.service";
import {
  createEvaluationSchema,
  listEvaluationsQuerySchema,
} from "@/modules/compliance/validators/evaluation.validator";

const evaluationService = new EvaluationService();

export async function GET(request: NextRequest) {
  try {
    const principal = await requireAuthentication(request);
    const query = listEvaluationsQuerySchema.parse(
      Object.fromEntries(request.nextUrl.searchParams),
    );
    const evaluations = await evaluationService.list(query, principal);

    return successResponse(
      evaluations,
      "Evaluaciones obtenidas correctamente.",
    );
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const principal = await requireAuthentication(request);
    const input = createEvaluationSchema.parse(await request.json());
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
