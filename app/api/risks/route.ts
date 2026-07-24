import type { NextRequest } from "next/server";

import { errorResponse, successResponse } from "@/lib/http-response";
import { requireAuthentication } from "@/modules/auth/services/auth-guard.service";
import { RiskService } from "@/modules/risks/services/risk.service";
import {
  createRiskSchema,
  listRisksQuerySchema,
} from "@/modules/risks/validators/risk.validator";

const riskService = new RiskService();

export async function GET(request: NextRequest) {
  try {
    const principal = await requireAuthentication(request);
    const query = listRisksQuerySchema.parse(
      Object.fromEntries(request.nextUrl.searchParams),
    );
    const risks = await riskService.list(query, principal);

    return successResponse(risks, "Riesgos obtenidos correctamente.");
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const principal = await requireAuthentication(request);
    const input = createRiskSchema.parse(await request.json());
    const risk = await riskService.create(input, principal);

    return successResponse(risk, "Riesgo creado correctamente.", 201);
  } catch (error) {
    return errorResponse(error);
  }
}
