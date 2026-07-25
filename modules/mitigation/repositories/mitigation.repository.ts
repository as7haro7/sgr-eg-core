import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { TransactionClient } from "@/lib/transaction";

type MitigationDatabaseClient = Pick<
  TransactionClient,
  "acciones_mitigacion" | "planes_mitigacion" | "riesgos" | "usuarios"
>;

const actionSelect = {
  id: true,
  descripcion: true,
  fecha_limite: true,
  avance: true,
  estado: true,
  created_at: true,
  usuarios: {
    select: { id: true, nombre: true },
  },
} satisfies Prisma.acciones_mitigacionSelect;

const planSelect = {
  id: true,
  descripcion: true,
  fecha_limite: true,
  avance: true,
  estado: true,
  created_at: true,
  usuarios: {
    select: { id: true, nombre: true },
  },
  acciones_mitigacion: {
    where: { deleted_at: null },
    select: actionSelect,
    orderBy: [{ fecha_limite: "asc" }, { id: "asc" }],
  },
} satisfies Prisma.planes_mitigacionSelect;

export class MitigationRepository {
  constructor(private readonly database: MitigationDatabaseClient = prisma) {}

  findRiskContext(riskId: string) {
    return this.database.riesgos.findFirst({
      where: { id: riskId, deleted_at: null },
      select: {
        id: true,
        unidad_id: true,
        propietario_id: true,
        creado_por: true,
      },
    });
  }

  listByRisk(riskId: string) {
    return this.database.planes_mitigacion.findMany({
      where: { riesgo_id: riskId, deleted_at: null },
      select: planSelect,
      orderBy: [{ fecha_limite: "asc" }, { id: "asc" }],
    });
  }

  findPlanById(planId: string) {
    return this.database.planes_mitigacion.findFirst({
      where: { id: planId, deleted_at: null },
      select: {
        ...planSelect,
        riesgo_id: true,
        responsable_id: true,
        riesgos: {
          select: {
            unidad_id: true,
            propietario_id: true,
            creado_por: true,
            deleted_at: true,
          },
        },
      },
    });
  }

  findActionById(actionId: string) {
    return this.database.acciones_mitigacion.findFirst({
      where: { id: actionId, deleted_at: null },
      select: {
        ...actionSelect,
        responsable_id: true,
        planes_mitigacion: {
          select: {
            id: true,
            responsable_id: true,
            deleted_at: true,
            riesgos: {
              select: {
                unidad_id: true,
                propietario_id: true,
                creado_por: true,
                deleted_at: true,
              },
            },
          },
        },
      },
    });
  }

  findActiveUser(userId: string) {
    return this.database.usuarios.findFirst({
      where: { id: userId, estado: "activo", deleted_at: null },
      select: { id: true },
    });
  }

  createPlan(data: Prisma.planes_mitigacionUncheckedCreateInput) {
    return this.database.planes_mitigacion.create({
      data,
      select: planSelect,
    });
  }

  updatePlan(
    planId: string,
    data: Prisma.planes_mitigacionUncheckedUpdateInput,
  ) {
    return this.database.planes_mitigacion.update({
      where: { id: planId },
      data,
      select: planSelect,
    });
  }

  createAction(data: Prisma.acciones_mitigacionUncheckedCreateInput) {
    return this.database.acciones_mitigacion.create({
      data,
      select: actionSelect,
    });
  }

  updateAction(
    actionId: string,
    data: Prisma.acciones_mitigacionUncheckedUpdateInput,
  ) {
    return this.database.acciones_mitigacion.update({
      where: { id: actionId },
      data,
      select: actionSelect,
    });
  }
}
