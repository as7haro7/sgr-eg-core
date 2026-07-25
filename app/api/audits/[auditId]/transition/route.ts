import type { NextRequest } from "next/server";

import { errorResponse, successResponse } from "@/lib/http-response";
import { requireAuthentication } from "@/modules/auth/services/auth-guard.service";
import { AuditService } from "@/modules/audits/services/audit.service";
import {
  auditIdSchema,
  transitionAuditSchema,
} from "@/modules/audits/validators/audit.validator";

const auditService = new AuditService();

interface RouteContext {
  params: Promise<{ auditId: string }>;
}

export async function POST(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const principal = await requireAuthentication(request);
    const auditId = auditIdSchema.parse((await context.params).auditId);
    const input = transitionAuditSchema.parse(await request.json());
    const audit = await auditService.transition(
      auditId,
      input,
      principal,
    );

    return successResponse(
      audit,
      "Estado de la auditoría actualizado correctamente.",
    );
  } catch (error) {
    return errorResponse(error);
  }
}
