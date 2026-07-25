import { randomUUID } from "node:crypto";

import type { Prisma } from "@/generated/prisma/client";
import { AppError } from "@/lib/app-error";
import { withAuditContext } from "@/lib/transaction";
import { AuthorizationService } from "@/modules/auth/services/authorization.service";
import type { AuthPrincipal } from "@/modules/auth/types/auth.types";
import type { AuthorizationContext } from "@/modules/auth/types/authorization.types";
import {
  defaultEvidenceMaxBytes,
  type EvidenceEntityType,
} from "@/modules/shared/constants/evidence";
import { EvidenceRepository } from "@/modules/shared/repositories/evidence.repository";
import { EvidenceStorageService } from "@/modules/shared/services/evidence-storage.service";
import type { EvidenceSummary } from "@/modules/shared/types/evidence.types";
import type {
  CreateLinkEvidenceInput,
  CreateFileEvidenceMetadataInput,
  EvidenceTarget,
} from "@/modules/shared/validators/evidence.validator";

type EvidenceRecord = Awaited<
  ReturnType<EvidenceRepository["create"]>
>;

interface ParentAuthorization {
  module: "auditorias" | "cumplimiento" | "mitigacion" | "riesgos";
  context: AuthorizationContext;
}

function mapEvidence(record: EvidenceRecord): EvidenceSummary {
  const entityType: EvidenceEntityType = record.riesgo_id
    ? "risk"
    : record.control_id
      ? "control"
      : record.plan_id
        ? "plan"
        : record.accion_id
          ? "action"
          : record.auditoria_id
            ? "audit"
            : record.hallazgo_id
              ? "finding"
              : "evaluation";

  return {
    id: record.id,
    type: record.tipo,
    entityType,
    name: record.nombre,
    mimeType: record.tipo_mime,
    sizeBytes: record.tamano_bytes?.toString() ?? null,
    referenceUrl:
      record.tipo === "archivo"
        ? `/api/evidence/${record.id}/download`
        : record.referencia_url,
    author: {
      id: record.usuarios.id,
      name: record.usuarios.nombre,
    },
    createdAt: record.created_at,
  };
}

const fieldByEntityType: Record<
  EvidenceEntityType,
  keyof Prisma.evidenciasUncheckedCreateInput
> = {
  risk: "riesgo_id",
  control: "control_id",
  plan: "plan_id",
  action: "accion_id",
  audit: "auditoria_id",
  finding: "hallazgo_id",
  evaluation: "evaluacion_id",
};

function getTargetFromRecord(record: EvidenceRecord): EvidenceTarget {
  if (record.riesgo_id) {
    return { entityType: "risk", entityId: record.riesgo_id };
  }
  if (record.control_id) {
    return { entityType: "control", entityId: record.control_id };
  }
  if (record.plan_id) {
    return { entityType: "plan", entityId: record.plan_id };
  }
  if (record.accion_id) {
    return { entityType: "action", entityId: record.accion_id };
  }
  if (record.auditoria_id) {
    return { entityType: "audit", entityId: record.auditoria_id };
  }
  if (record.hallazgo_id) {
    return { entityType: "finding", entityId: record.hallazgo_id };
  }
  if (record.evaluacion_id) {
    return { entityType: "evaluation", entityId: record.evaluacion_id };
  }

  throw parentNotFound();
}

function parseMaxFileSize(value: unknown): number {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : Number.NaN;

  return Number.isSafeInteger(parsed) && parsed > 0
    ? parsed
    : defaultEvidenceMaxBytes;
}

function parentNotFound(): AppError {
  return new AppError(
    "NOT_FOUND",
    "La entidad asociada a la evidencia no existe.",
    404,
  );
}

function startsWith(content: Uint8Array, signature: readonly number[]) {
  return signature.every((byte, index) => content[index] === byte);
}

function assertFileSignature(content: Uint8Array, mimeType: string): void {
  const valid =
    mimeType === "application/pdf"
      ? startsWith(content, [0x25, 0x50, 0x44, 0x46])
      : mimeType === "image/png"
        ? startsWith(content, [0x89, 0x50, 0x4e, 0x47])
        : mimeType === "image/jpeg"
          ? startsWith(content, [0xff, 0xd8, 0xff])
          : mimeType === "image/webp"
            ? startsWith(content, [0x52, 0x49, 0x46, 0x46]) &&
              startsWith(content.slice(8), [0x57, 0x45, 0x42, 0x50])
            : mimeType.includes("openxmlformats-officedocument")
              ? startsWith(content, [0x50, 0x4b, 0x03, 0x04])
              : !content.includes(0) &&
                !startsWith(content, [0x4d, 0x5a]) &&
                !startsWith(content, [0x7f, 0x45, 0x4c, 0x46]) &&
                !startsWith(content, [0x23, 0x21]);

  if (!valid) {
    throw new AppError(
      "VALIDATION_ERROR",
      "El contenido del archivo no coincide con un tipo permitido.",
      400,
    );
  }
}

export class EvidenceService {
  constructor(
    private readonly repository = new EvidenceRepository(),
    private readonly authorization = new AuthorizationService(),
    private readonly storage = new EvidenceStorageService(),
  ) {}

  async list(
    target: EvidenceTarget,
    principal: AuthPrincipal,
  ): Promise<EvidenceSummary[]> {
    const parent = await this.resolveParent(target);
    this.authorization.assertAllowed(
      principal,
      parent.module,
      "read",
      parent.context,
    );
    const evidence = await this.repository.list(
      target.entityType,
      target.entityId,
    );

    return evidence.map(mapEvidence);
  }

  async createLink(
    input: CreateLinkEvidenceInput,
    principal: AuthPrincipal,
  ): Promise<EvidenceSummary> {
    const parent = await this.resolveParent(input);
    this.authorization.assertAllowed(
      principal,
      parent.module,
      "update",
      parent.context,
    );
    const data = {
      tipo: "enlace",
      nombre: input.name,
      referencia_url: input.referenceUrl,
      autor_id: principal.userId,
      [fieldByEntityType[input.entityType]]: input.entityId,
    } as Prisma.evidenciasUncheckedCreateInput;
    const evidence = await withAuditContext(
      principal.userId,
      async (transaction) => {
        const repository = new EvidenceRepository(transaction);
        return repository.create(data);
      },
    );

    return mapEvidence(evidence);
  }

  async getMaxFileSize(): Promise<number> {
    const parameter = await this.repository.findMaxFileSizeParameter();

    return parseMaxFileSize(parameter?.valor);
  }

  async createFile(
    metadata: CreateFileEvidenceMetadataInput,
    content: Uint8Array,
    principal: AuthPrincipal,
  ): Promise<EvidenceSummary> {
    const parent = await this.resolveParent(metadata);
    this.authorization.assertAllowed(
      principal,
      parent.module,
      "update",
      parent.context,
    );
    const maxFileSize = await this.getMaxFileSize();

    if (metadata.sizeBytes > maxFileSize) {
      throw new AppError(
        "VALIDATION_ERROR",
        `La evidencia excede el tamaño máximo permitido (${maxFileSize} bytes).`,
        400,
      );
    }

    if (content.byteLength !== metadata.sizeBytes) {
      throw new AppError(
        "VALIDATION_ERROR",
        "El tamaño declarado del archivo no coincide con su contenido.",
        400,
      );
    }
    assertFileSignature(content, metadata.mimeType);

    const objectPath = `${metadata.entityType}/${metadata.entityId}/${randomUUID()}`;
    await this.storage.upload(objectPath, content, metadata.mimeType);

    try {
      const evidence = await withAuditContext(
        principal.userId,
        async (transaction) => {
          const repository = new EvidenceRepository(transaction);
          return repository.create({
            tipo: "archivo",
            nombre: metadata.name,
            tipo_mime: metadata.mimeType,
            tamano_bytes: BigInt(metadata.sizeBytes),
            referencia_url: objectPath,
            autor_id: principal.userId,
            [fieldByEntityType[metadata.entityType]]: metadata.entityId,
          } as Prisma.evidenciasUncheckedCreateInput);
        },
      );

      return mapEvidence(evidence);
    } catch (error) {
      await this.storage.remove(objectPath);
      throw error;
    }
  }

  async getDownloadUrl(
    evidenceId: string,
    principal: AuthPrincipal,
  ): Promise<string> {
    const evidence = await this.repository.findById(evidenceId);

    if (!evidence || evidence.tipo !== "archivo") {
      throw new AppError(
        "NOT_FOUND",
        "La evidencia de archivo no existe.",
        404,
      );
    }

    const target = getTargetFromRecord(evidence);
    const parent = await this.resolveParent(target);
    this.authorization.assertAllowed(
      principal,
      parent.module,
      "read",
      parent.context,
    );

    try {
      const reference = new URL(evidence.referencia_url);

      if (["http:", "https:"].includes(reference.protocol)) {
        return reference.toString();
      }
    } catch {
      // Las referencias de Storage son rutas internas, no URLs.
    }

    return this.storage.createSignedDownloadUrl(
      evidence.referencia_url,
      evidence.nombre,
    );
  }

  private async resolveParent(
    target: EvidenceTarget,
  ): Promise<ParentAuthorization> {
    switch (target.entityType) {
      case "risk": {
        const risk = await this.repository.findRisk(target.entityId);
        if (!risk) throw parentNotFound();
        return {
          module: "riesgos",
          context: {
            unitId: risk.unidad_id,
            ownerId: risk.creado_por,
            assigneeIds: risk.propietario_id
              ? [risk.propietario_id]
              : [],
          },
        };
      }
      case "control": {
        const control = await this.repository.findControl(target.entityId);
        if (!control) throw parentNotFound();
        const risk = control.riesgos;
        return {
          module: "mitigacion",
          context: {
            unitId: risk.unidad_id,
            ownerId: risk.creado_por,
            assigneeIds: risk.propietario_id
              ? [risk.propietario_id]
              : [],
          },
        };
      }
      case "plan": {
        const plan = await this.repository.findPlan(target.entityId);
        if (!plan) throw parentNotFound();
        const risk = plan.riesgos;
        return {
          module: "mitigacion",
          context: {
            unitId: risk.unidad_id,
            ownerId: risk.creado_por,
            assigneeIds: [
              ...(risk.propietario_id ? [risk.propietario_id] : []),
              plan.responsable_id,
            ],
          },
        };
      }
      case "action": {
        const action = await this.repository.findAction(target.entityId);
        if (!action) throw parentNotFound();
        const plan = action.planes_mitigacion;
        const risk = plan.riesgos;
        return {
          module: "mitigacion",
          context: {
            unitId: risk.unidad_id,
            ownerId: risk.creado_por,
            assigneeIds: [
              ...(risk.propietario_id ? [risk.propietario_id] : []),
              plan.responsable_id,
              action.responsable_id,
            ],
          },
        };
      }
      case "audit": {
        const audit = await this.repository.findAudit(target.entityId);
        if (!audit) throw parentNotFound();
        return {
          module: "auditorias",
          context: {
            unitId: audit.unidad_id ?? undefined,
            ownerId: audit.responsable_id,
            assigneeIds: [
              audit.responsable_id,
              ...audit.auditoria_equipo.map(({ usuario_id }) => usuario_id),
            ],
          },
        };
      }
      case "finding": {
        const finding = await this.repository.findFinding(target.entityId);
        if (!finding) throw parentNotFound();
        const audit = finding.auditorias;
        return {
          module: "auditorias",
          context: {
            unitId: audit.unidad_id ?? undefined,
            ownerId: audit.responsable_id,
            assigneeIds: [
              audit.responsable_id,
              ...audit.auditoria_equipo.map(({ usuario_id }) => usuario_id),
              ...(finding.responsable_id ? [finding.responsable_id] : []),
            ],
          },
        };
      }
      case "evaluation": {
        const evaluation = await this.repository.findEvaluation(
          target.entityId,
        );
        if (!evaluation) throw parentNotFound();
        return {
          module: "cumplimiento",
          context: {
            unitId: evaluation.unidad_id,
            ownerId: evaluation.evaluador_id,
            assigneeIds: [
              evaluation.evaluador_id,
              ...(evaluation.responsable_plan_id
                ? [evaluation.responsable_plan_id]
                : []),
            ],
          },
        };
      }
    }
  }
}
