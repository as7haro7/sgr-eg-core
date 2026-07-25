import type { NextRequest } from "next/server";

import { errorResponse, successResponse } from "@/lib/http-response";
import { requireAuthentication } from "@/modules/auth/services/auth-guard.service";
import { AuditLogService } from "@/modules/audit-log/services/audit-log.service";
import { listAuditLogQuerySchema } from "@/modules/audit-log/validators/audit-log.validator";

const auditLogService = new AuditLogService();

export async function GET(request: NextRequest) {
  try {
    const principal = await requireAuthentication(request);
    const query = listAuditLogQuerySchema.parse(
      Object.fromEntries(request.nextUrl.searchParams),
    );
    const logs = await auditLogService.list(query, principal);

    return successResponse(logs, "Bitácora obtenida correctamente.");
  } catch (error) {
    return errorResponse(error);
  }
}
