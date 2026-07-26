import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { TransactionClient } from "@/lib/transaction";
import type { EvidenceEntityType } from "@/modules/shared/constants/evidence";

type EvidenceDatabaseClient = Pick<
  TransactionClient,
  | "acciones_mitigacion"
  | "auditorias"
  | "controles"
  | "evaluaciones_cumplimiento"
  | "evidencias"
  | "hallazgos"
  | "parametros_sistema"
  | "planes_mitigacion"
  | "riesgos"
>;

const evidenceSelect = {
  id: true,
  tipo: true,
  riesgo_id: true,
  control_id: true,
  plan_id: true,
  accion_id: true,
  auditoria_id: true,
  hallazgo_id: true,
  evaluacion_id: true,
  nombre: true,
  tipo_mime: true,
  tamano_bytes: true,
  referencia_url: true,
  created_at: true,
  usuarios: {
    select: { id: true, nombre: true },
  },
} satisfies Prisma.evidenciasSelect;

function targetWhere(entityType: EvidenceEntityType, entityId: string) {
  const fieldByType: Record<
    EvidenceEntityType,
    keyof Prisma.evidenciasWhereInput
  > = {
    risk: "riesgo_id",
    control: "control_id",
    plan: "plan_id",
    action: "accion_id",
    audit: "auditoria_id",
    finding: "hallazgo_id",
    evaluation: "evaluacion_id",
  };

  return { [fieldByType[entityType]]: entityId };
}

export class EvidenceRepository {
  constructor(private readonly database: EvidenceDatabaseClient = prisma) {}

  list(entityType: EvidenceEntityType, entityId: string) {
    return this.database.evidencias.findMany({
      where: {
        ...targetWhere(entityType, entityId),
        deleted_at: null,
      },
      select: evidenceSelect,
      orderBy: [{ created_at: "desc" }, { id: "desc" }],
    });
  }

  listRiskTreatment(
    riskId: string,
    targetIds: {
      controlIds: string[];
      planIds: string[];
      actionIds: string[];
    },
  ) {
    return this.database.evidencias.findMany({
      where: {
        deleted_at: null,
        OR: [
          {
            control_id: { in: targetIds.controlIds },
            controles: { riesgo_id: riskId, deleted_at: null },
          },
          {
            plan_id: { in: targetIds.planIds },
            planes_mitigacion: { riesgo_id: riskId, deleted_at: null },
          },
          {
            accion_id: { in: targetIds.actionIds },
            acciones_mitigacion: {
              deleted_at: null,
              planes_mitigacion: {
                riesgo_id: riskId,
                deleted_at: null,
              },
            },
          },
        ],
      },
      select: evidenceSelect,
      orderBy: [{ created_at: "desc" }, { id: "desc" }],
    });
  }

  create(data: Prisma.evidenciasUncheckedCreateInput) {
    return this.database.evidencias.create({
      data,
      select: evidenceSelect,
    });
  }

  findById(evidenceId: string) {
    return this.database.evidencias.findFirst({
      where: { id: evidenceId, deleted_at: null },
      select: evidenceSelect,
    });
  }

  findMaxFileSizeParameter() {
    return this.database.parametros_sistema.findUnique({
      where: { clave: "evidencia_max_bytes" },
      select: { valor: true },
    });
  }

  findRisk(id: string) {
    return this.database.riesgos.findFirst({
      where: { id, deleted_at: null },
      select: {
        unidad_id: true,
        propietario_id: true,
        creado_por: true,
      },
    });
  }

  findControl(id: string) {
    return this.database.controles.findFirst({
      where: { id, deleted_at: null, riesgos: { deleted_at: null } },
      select: {
        riesgos: {
          select: {
            unidad_id: true,
            propietario_id: true,
            creado_por: true,
          },
        },
      },
    });
  }

  findPlan(id: string) {
    return this.database.planes_mitigacion.findFirst({
      where: { id, deleted_at: null, riesgos: { deleted_at: null } },
      select: {
        responsable_id: true,
        riesgos: {
          select: {
            unidad_id: true,
            propietario_id: true,
            creado_por: true,
          },
        },
      },
    });
  }

  findAction(id: string) {
    return this.database.acciones_mitigacion.findFirst({
      where: {
        id,
        deleted_at: null,
        planes_mitigacion: {
          deleted_at: null,
          riesgos: { deleted_at: null },
        },
      },
      select: {
        responsable_id: true,
        planes_mitigacion: {
          select: {
            responsable_id: true,
            riesgos: {
              select: {
                unidad_id: true,
                propietario_id: true,
                creado_por: true,
              },
            },
          },
        },
      },
    });
  }

  findAudit(id: string) {
    return this.database.auditorias.findFirst({
      where: { id, deleted_at: null },
      select: {
        unidad_id: true,
        responsable_id: true,
        auditoria_equipo: {
          select: { usuario_id: true },
        },
      },
    });
  }

  findFinding(id: string) {
    return this.database.hallazgos.findFirst({
      where: { id, deleted_at: null, auditorias: { deleted_at: null } },
      select: {
        responsable_id: true,
        auditorias: {
          select: {
            unidad_id: true,
            responsable_id: true,
            auditoria_equipo: {
              select: { usuario_id: true },
            },
          },
        },
      },
    });
  }

  findEvaluation(id: string) {
    return this.database.evaluaciones_cumplimiento.findFirst({
      where: { id, deleted_at: null },
      select: {
        unidad_id: true,
        evaluador_id: true,
        responsable_plan_id: true,
      },
    });
  }
}
