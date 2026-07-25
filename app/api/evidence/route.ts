import type { NextRequest } from "next/server";

import { errorResponse, successResponse } from "@/lib/http-response";
import { requireAuthentication } from "@/modules/auth/services/auth-guard.service";
import { EvidenceService } from "@/modules/shared/services/evidence.service";
import {
  createLinkEvidenceSchema,
  evidenceTargetSchema,
} from "@/modules/shared/validators/evidence.validator";

const evidenceService = new EvidenceService();

export async function GET(request: NextRequest) {
  try {
    const principal = await requireAuthentication(request);
    const target = evidenceTargetSchema.parse(
      Object.fromEntries(request.nextUrl.searchParams),
    );
    const evidence = await evidenceService.list(target, principal);
    return successResponse(evidence, "Evidencias obtenidas correctamente.");
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const principal = await requireAuthentication(request);
    const input = createLinkEvidenceSchema.parse(await request.json());
    const evidence = await evidenceService.createLink(input, principal);
    return successResponse(evidence, "Evidencia registrada correctamente.", 201);
  } catch (error) {
    return errorResponse(error);
  }
}
