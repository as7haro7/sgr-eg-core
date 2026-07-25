import type { Prisma } from "@/generated/prisma/client";
import { AppError } from "@/lib/app-error";
import { withAuditContext } from "@/lib/transaction";
import { AuthorizationService } from "@/modules/auth/services/authorization.service";
import type { AuthPrincipal } from "@/modules/auth/types/auth.types";
import type { AuthorizationContext } from "@/modules/auth/types/authorization.types";
import type { EvidenceEntityType } from "@/modules/shared/constants/evidence";
import { EvidenceRepository } from "@/modules/shared/repositories/evidence.repository";
import type { EvidenceSummary } from "@/modules/shared/types/evidence.types";
import type {
  CreateLinkEvidenceInput,
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
    referenceUrl: record.referencia_url,
    author: {
      id: record.usuarios.id,
      name: record.usuarios.nombre,
    },
    createdAt: record.created_at,
  };
}

function parentNotFound(): AppError {
  return new AppError(
    "NOT_FOUND",
    "La entidad asociada a la evidencia no existe.",
    404,
  );
}

export class EvidenceService {
  constructor(
    private readonly repository = new EvidenceRepository(),
    private readonly authorization = new AuthorizationService(),
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
    const fieldByType: Record<
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
    const data = {
      tipo: "enlace",
      nombre: input.name,
      referencia_url: input.referenceUrl,
      autor_id: principal.userId,
      [fieldByType[input.entityType]]: input.entityId,
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
