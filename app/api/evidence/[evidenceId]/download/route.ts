import { NextResponse, type NextRequest } from "next/server";

import { errorResponse } from "@/lib/http-response";
import { requireAuthentication } from "@/modules/auth/services/auth-guard.service";
import { EvidenceService } from "@/modules/shared/services/evidence.service";
import { evidenceIdSchema } from "@/modules/shared/validators/evidence.validator";

const evidenceService = new EvidenceService();

interface RouteContext {
  params: Promise<{ evidenceId: string }>;
}

export async function GET(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const principal = await requireAuthentication(request);
    const evidenceId = evidenceIdSchema.parse(
      (await context.params).evidenceId,
    );
    const downloadUrl = await evidenceService.getDownloadUrl(
      evidenceId,
      principal,
    );

    return NextResponse.redirect(downloadUrl, {
      status: 307,
      headers: {
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
