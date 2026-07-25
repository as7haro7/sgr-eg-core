import type { NextRequest } from "next/server";

import { AppError } from "@/lib/app-error";
import { errorResponse, successResponse } from "@/lib/http-response";
import { requireAuthentication } from "@/modules/auth/services/auth-guard.service";
import { EvidenceService } from "@/modules/shared/services/evidence.service";
import { createFileEvidenceMetadataSchema } from "@/modules/shared/validators/evidence.validator";

const evidenceService = new EvidenceService();

export async function POST(request: NextRequest) {
  try {
    const principal = await requireAuthentication(request);
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      throw new AppError(
        "VALIDATION_ERROR",
        "Debes seleccionar un archivo.",
        400,
      );
    }

    const metadata = createFileEvidenceMetadataSchema.parse({
      entityType: formData.get("entityType"),
      entityId: formData.get("entityId"),
      name: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
    });
    const maxFileSize = await evidenceService.getMaxFileSize();

    if (metadata.sizeBytes > maxFileSize) {
      throw new AppError(
        "VALIDATION_ERROR",
        `La evidencia excede el tamaño máximo permitido (${maxFileSize} bytes).`,
        400,
      );
    }

    const evidence = await evidenceService.createFile(
      metadata,
      new Uint8Array(await file.arrayBuffer()),
      principal,
    );

    return successResponse(
      evidence,
      "Archivo de evidencia cargado correctamente.",
      201,
    );
  } catch (error) {
    return errorResponse(error);
  }
}
