import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { TransactionClient } from "@/lib/transaction";

type FindingDatabaseClient = Pick<
  TransactionClient,
  "auditorias" | "evidencias" | "hallazgos" | "riesgos" | "usuarios"
>;

export const findingSummarySelect = {
  id: true,
  auditoria_id: true,
  riesgo_id: true,
  severidad: true,
  condicion: true,
  recomendacion: true,
  respuesta: true,
  responsable_id: true,
  fecha_limite: true,
  fecha_respuesta: true,
  estado: true,
  requiere_evidencia_cierre: true,
  cerrado_por: true,
  cerrado_at: true,
  created_at: true,
  updated_at: true,
  usuarios_hallazgos_responsable_idTousuarios: {
    select: { id: true, nombre: true },
  },
  usuarios_hallazgos_cerrado_porTousuarios: {
    select: { id: true, nombre: true },
  },
  riesgos: {
    select: { id: true, codigo: true, titulo: true },
  },
  _count: {
    select: { evidencias: { where: { deleted_at: null } } },
  },
} satisfies Prisma.hallazgosSelect;

export type FindingSummaryRecord = Prisma.hallazgosGetPayload<{
  select: typeof findingSummarySelect;
}>;

export class FindingRepository {
  constructor(private readonly database: FindingDatabaseClient = prisma) {}

  listByAudit(auditId: string) {
    return this.database.hallazgos.findMany({
      where: { auditoria_id: auditId, deleted_at: null },
      select: findingSummarySelect,
      orderBy: [{ created_at: "desc" }, { id: "desc" }],
    });
  }

  findById(id: string) {
    return this.database.hallazgos.findFirst({
      where: {
        id,
        deleted_at: null,
        auditorias: { deleted_at: null },
      },
      select: {
        ...findingSummarySelect,
        auditorias: {
          select: {
            unidad_id: true,
            responsable_id: true,
            auditoria_equipo: { select: { usuario_id: true } },
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
        auditoria_equipo: { select: { usuario_id: true } },
      },
    });
  }

  create(data: Prisma.hallazgosUncheckedCreateInput) {
    return this.database.hallazgos.create({
      data,
      select: findingSummarySelect,
    });
  }

  update(id: string, data: Prisma.hallazgosUncheckedUpdateInput) {
    return this.database.hallazgos.update({
      where: { id },
      data,
      select: findingSummarySelect,
    });
  }

  findActiveUser(id: string) {
    return this.database.usuarios.findFirst({
      where: { id, estado: "activo", deleted_at: null },
      select: { id: true },
    });
  }

  findRisk(id: string) {
    return this.database.riesgos.findFirst({
      where: { id, deleted_at: null },
      select: { id: true },
    });
  }

  listRiskOptions(unitId: string | null) {
    return this.database.riesgos.findMany({
      where: {
        deleted_at: null,
        unidad_id: unitId ?? undefined,
      },
      select: { id: true, codigo: true, titulo: true },
      orderBy: [{ codigo: "asc" }, { id: "asc" }],
    });
  }

  countActiveEvidence(findingId: string) {
    return this.database.evidencias.count({
      where: { hallazgo_id: findingId, deleted_at: null },
    });
  }
}
