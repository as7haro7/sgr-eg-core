import { AppError } from "@/lib/app-error";
import { withAuditContext } from "@/lib/transaction";
import { AuthorizationService } from "@/modules/auth/services/authorization.service";
import { scheduleAlertEvaluation } from "@/modules/alerts/services/alert-trigger.service";
import type { AuthPrincipal } from "@/modules/auth/types/auth.types";
import {
  FindingRepository,
  type FindingSummaryRecord,
} from "@/modules/findings/repositories/finding.repository";
import type {
  FindingRiskOption,
  FindingSummary,
} from "@/modules/findings/types/finding.types";
import type {
  CreateFindingInput,
  RespondFindingInput,
  UpdateFindingInput,
} from "@/modules/findings/validators/finding.validator";

type AuditContext = NonNullable<
  Awaited<ReturnType<FindingRepository["findAudit"]>>
>;
type FindingRecord = NonNullable<
  Awaited<ReturnType<FindingRepository["findById"]>>
>;

function mapFinding(record: FindingSummaryRecord): FindingSummary {
  const responsible =
    record.usuarios_hallazgos_responsable_idTousuarios;
  const closedBy = record.usuarios_hallazgos_cerrado_porTousuarios;

  return {
    id: record.id,
    auditId: record.auditoria_id,
    severity: record.severidad,
    condition: record.condicion,
    recommendation: record.recomendacion,
    response: record.respuesta,
    responsible: responsible
      ? { id: responsible.id, name: responsible.nombre }
      : null,
    deadline: record.fecha_limite,
    responseDate: record.fecha_respuesta,
    status: record.estado,
    requiresClosingEvidence: record.requiere_evidencia_cierre,
    closedBy: closedBy
      ? { id: closedBy.id, name: closedBy.nombre }
      : null,
    closedAt: record.cerrado_at,
    risk: record.riesgos
      ? {
          id: record.riesgos.id,
          code: record.riesgos.codigo,
          title: record.riesgos.titulo,
        }
      : null,
    evidenceCount: record._count.evidencias,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

function authorizationContext(
  audit: AuditContext,
  findingResponsibleId?: string | null,
) {
  return {
    unitId: audit.unidad_id ?? undefined,
    ownerId: audit.responsable_id,
    assigneeIds: [
      audit.responsable_id,
      ...audit.auditoria_equipo.map(({ usuario_id }) => usuario_id),
      ...(findingResponsibleId ? [findingResponsibleId] : []),
    ],
  };
}

function auditNotFound(): AppError {
  return new AppError("NOT_FOUND", "La auditoría no existe.", 404);
}

function findingNotFound(): AppError {
  return new AppError("NOT_FOUND", "El hallazgo no existe.", 404);
}

export class FindingService {
  constructor(
    private readonly repository = new FindingRepository(),
    private readonly authorization = new AuthorizationService(),
  ) {}

  async list(
    auditId: string,
    principal: AuthPrincipal,
  ): Promise<FindingSummary[]> {
    const audit = await this.repository.findAudit(auditId);
    if (!audit) throw auditNotFound();

    this.authorization.assertAllowed(
      principal,
      "auditorias",
      "read",
      authorizationContext(audit),
    );

    return (await this.repository.listByAudit(auditId)).map(mapFinding);
  }

  async getById(
    findingId: string,
    principal: AuthPrincipal,
  ): Promise<FindingSummary> {
    const finding = await this.getAuthorizedFinding(
      findingId,
      principal,
      "read",
    );
    return mapFinding(finding);
  }

  async update(
    findingId: string,
    input: UpdateFindingInput,
    principal: AuthPrincipal,
  ): Promise<FindingSummary> {
    const finding = await this.getAuthorizedFinding(
      findingId,
      principal,
      "update",
    );

    if (finding.estado === "cerrado") {
      throw new AppError("CONFLICT", "No se puede editar un hallazgo cerrado.", 409);
    }

    if (input.responsibleId) {
      const responsible = await this.repository.findActiveUser(input.responsibleId);
      if (!responsible) {
        throw new AppError("VALIDATION_ERROR", "El responsable no existe o está inactivo.", 400);
      }
    }

    if (input.riskId) {
      const risk = await this.repository.findRisk(input.riskId);
      if (!risk) {
        throw new AppError("VALIDATION_ERROR", "El riesgo relacionado no existe.", 400);
      }
    }

    const updated = await withAuditContext(principal.userId, (tx) =>
      new FindingRepository(tx).update(findingId, {
        riesgo_id: input.riskId,
        severidad: input.severity,
        condicion: input.condition,
        recomendacion: input.recommendation,
        responsable_id: input.responsibleId,
        fecha_limite: input.deadline,
        requiere_evidencia_cierre:
          input.severity === "critica" ? true : input.requiresClosingEvidence,
        updated_at: new Date(),
      }),
    );

    scheduleAlertEvaluation();
    return mapFinding(updated);
  }

  async listRiskOptions(
    auditId: string,
    principal: AuthPrincipal,
  ): Promise<FindingRiskOption[]> {
    const audit = await this.repository.findAudit(auditId);
    if (!audit) throw auditNotFound();

    this.authorization.assertAllowed(
      principal,
      "auditorias",
      "read",
      authorizationContext(audit),
    );

    return (await this.repository.listRiskOptions(audit.unidad_id)).map(
      (risk) => ({
        id: risk.id,
        code: risk.codigo,
        title: risk.titulo,
      }),
    );
  }

  async create(
    auditId: string,
    input: CreateFindingInput,
    principal: AuthPrincipal,
  ): Promise<FindingSummary> {
    const audit = await this.repository.findAudit(auditId);
    if (!audit) throw auditNotFound();

    this.authorization.assertAllowed(
      principal,
      "auditorias",
      "update",
      authorizationContext(audit),
    );

    const [responsible, risk] = await Promise.all([
      input.responsibleId
        ? this.repository.findActiveUser(input.responsibleId)
        : Promise.resolve({ id: "" }),
      input.riskId
        ? this.repository.findRisk(input.riskId)
        : Promise.resolve({ id: "" }),
    ]);

    if (input.responsibleId && !responsible) {
      throw new AppError(
        "VALIDATION_ERROR",
        "El responsable no existe o está inactivo.",
        400,
      );
    }
    if (input.riskId && !risk) {
      throw new AppError(
        "VALIDATION_ERROR",
        "El riesgo relacionado no existe.",
        400,
      );
    }

    const finding = await withAuditContext(
      principal.userId,
      (transaction) =>
        new FindingRepository(transaction).create({
          auditoria_id: auditId,
          riesgo_id: input.riskId,
          severidad: input.severity,
          condicion: input.condition,
          recomendacion: input.recommendation,
          responsable_id: input.responsibleId,
          fecha_limite: input.deadline,
          estado: "abierto",
          requiere_evidencia_cierre:
            input.severity === "critica"
              ? true
              : input.requiresClosingEvidence,
        }),
    );

    scheduleAlertEvaluation();
    return mapFinding(finding);
  }

  async respond(
    findingId: string,
    input: RespondFindingInput,
    principal: AuthPrincipal,
  ): Promise<FindingSummary> {
    const finding = await this.getAuthorizedFinding(
      findingId,
      principal,
      "update",
    );
    if (finding.estado === "cerrado") {
      throw new AppError(
        "CONFLICT",
        "Un hallazgo cerrado no admite nuevas respuestas.",
        409,
      );
    }

    const updated = await withAuditContext(
      principal.userId,
      (transaction) =>
        new FindingRepository(transaction).update(findingId, {
          respuesta: input.response,
          fecha_respuesta: new Date(),
          estado: "en_seguimiento",
          updated_at: new Date(),
        }),
    );

    scheduleAlertEvaluation();
    return mapFinding(updated);
  }

  async close(
    findingId: string,
    principal: AuthPrincipal,
  ): Promise<FindingSummary> {
    const finding = await this.getAuthorizedFinding(
      findingId,
      principal,
      "update",
    );
    if (finding.estado === "cerrado") {
      throw new AppError("CONFLICT", "El hallazgo ya está cerrado.", 409);
    }
    if (
      finding.requiere_evidencia_cierre &&
      (await this.repository.countActiveEvidence(findingId)) === 0
    ) {
      throw new AppError(
        "VALIDATION_ERROR",
        "Registra al menos una evidencia antes de cerrar el hallazgo.",
        400,
      );
    }

    const updated = await withAuditContext(
      principal.userId,
      (transaction) =>
        new FindingRepository(transaction).update(findingId, {
          estado: "cerrado",
          cerrado_por: principal.userId,
          cerrado_at: new Date(),
          updated_at: new Date(),
        }),
    );

    scheduleAlertEvaluation();
    return mapFinding(updated);
  }

  private async getAuthorizedFinding(
    findingId: string,
    principal: AuthPrincipal,
    action: "read" | "update",
  ): Promise<FindingRecord> {
    const finding = await this.repository.findById(findingId);
    if (!finding) throw findingNotFound();

    this.authorization.assertAllowed(
      principal,
      "auditorias",
      action,
      authorizationContext(finding.auditorias, finding.responsable_id),
    );

    return finding;
  }
}
