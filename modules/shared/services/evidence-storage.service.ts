import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { getEvidenceStorageEnv } from "@/config/env";
import { AppError } from "@/lib/app-error";
import { logger } from "@/lib/logger";

let storageClient: SupabaseClient | null = null;

function getStorageClient(): SupabaseClient {
  if (storageClient) return storageClient;

  let storageEnv: ReturnType<typeof getEvidenceStorageEnv>;

  try {
    storageEnv = getEvidenceStorageEnv();
  } catch {
    throw new AppError(
      "SERVICE_UNAVAILABLE",
      "El almacenamiento de evidencias no está configurado.",
      503,
    );
  }

  storageClient = createClient(
    storageEnv.SUPABASE_URL,
    storageEnv.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );

  return storageClient;
}

function getBucketName(): string {
  try {
    return getEvidenceStorageEnv().SUPABASE_EVIDENCE_BUCKET;
  } catch {
    throw new AppError(
      "SERVICE_UNAVAILABLE",
      "El almacenamiento de evidencias no está configurado.",
      503,
    );
  }
}

export class EvidenceStorageService {
  async upload(
    objectPath: string,
    content: Uint8Array,
    contentType: string,
  ): Promise<void> {
    const { error } = await getStorageClient()
      .storage.from(getBucketName())
      .upload(objectPath, content, {
        contentType,
        upsert: false,
      });

    if (error) {
      logger.error("Evidence storage upload failed", {
        storageCode: error.name,
      });
      throw new AppError(
        "SERVICE_UNAVAILABLE",
        "No fue posible almacenar el archivo de evidencia.",
        503,
      );
    }
  }

  async remove(objectPath: string): Promise<void> {
    const { error } = await getStorageClient()
      .storage.from(getBucketName())
      .remove([objectPath]);

    if (error) {
      logger.error("Evidence storage compensation failed", {
        storageCode: error.name,
      });
    }
  }

  async createSignedDownloadUrl(
    objectPath: string,
    downloadName: string,
    expiresInSeconds = 60,
  ): Promise<string> {
    const { data, error } = await getStorageClient()
      .storage.from(getBucketName())
      .createSignedUrl(objectPath, expiresInSeconds, {
        download: downloadName,
      });

    if (error) {
      logger.error("Evidence signed URL creation failed", {
        storageCode: error.name,
      });
      throw new AppError(
        "NOT_FOUND",
        "El archivo de evidencia no está disponible.",
        404,
      );
    }

    return data.signedUrl;
  }
}
