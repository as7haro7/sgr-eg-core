import type { NextRequest } from "next/server";

import { errorResponse, successResponse } from "@/lib/http-response";
import { requireAuthentication } from "@/modules/auth/services/auth-guard.service";
import { AuditService } from "@/modules/audits/services/audit.service";
import {
  auditIdSchema,
  updateAuditSchema,
} from "@/modules/audits/validators/audit.validator";

const auditService = new AuditService();

interface RouteContext {
  params: Promise<{ auditId: string }>;
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const principal = await requireAuthentication(request);
    const auditId = auditIdSchema.parse((await context.params).auditId);
    const input = updateAuditSchema.parse(await request.json());
    const audit = await auditService.update(auditId, input, principal);

    return successResponse(audit, "Auditoría actualizada correctamente.");
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
    const auditId = auditIdSchema.parse((await context.params).auditId);
    const audit = await auditService.getById(auditId, principal);

    return successResponse(audit, "Auditoría obtenida correctamente.");
  } catch (error) {
    return errorResponse(error);
  }
}
