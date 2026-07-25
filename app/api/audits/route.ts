import type { NextRequest } from "next/server";

import { errorResponse, successResponse } from "@/lib/http-response";
import { requireAuthentication } from "@/modules/auth/services/auth-guard.service";
import { AuditService } from "@/modules/audits/services/audit.service";
import {
  createAuditSchema,
  listAuditsQuerySchema,
} from "@/modules/audits/validators/audit.validator";

const auditService = new AuditService();

export async function GET(request: NextRequest) {
  try {
    const principal = await requireAuthentication(request);
    const query = listAuditsQuerySchema.parse(
      Object.fromEntries(request.nextUrl.searchParams),
    );
    const audits = await auditService.list(query, principal);

    return successResponse(audits, "Auditorías obtenidas correctamente.");
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const principal = await requireAuthentication(request);
    const input = createAuditSchema.parse(await request.json());
    const audit = await auditService.create(input, principal);

    return successResponse(audit, "Auditoría planificada correctamente.", 201);
  } catch (error) {
    return errorResponse(error);
  }
}
