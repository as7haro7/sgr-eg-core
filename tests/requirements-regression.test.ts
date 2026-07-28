import { describe, expect, it } from "vitest";

import { patchAlertSchema } from "@/modules/alerts/validators/alert.validator";
import { updateAuditSchema } from "@/modules/audits/validators/audit.validator";
import { updateEvaluationSchema } from "@/modules/compliance/validators/evaluation.validator";
import {
  updateRegulationSchema,
  updateRequirementSchema,
} from "@/modules/regulations/validators/regulation.validator";
import type { SystemParameterRepository } from "@/modules/shared/repositories/system-parameter.repository";
import { SystemParameterService } from "@/modules/shared/services/system-parameter.service";

const UUID = "30000000-0000-4000-8000-000000000001";

describe("Regresiones de requisitos ampliados", () => {
  it("conserva la vigencia cuando PATCH no envía validUntil", () => {
    const regulation = updateRegulationSchema.parse({ name: "Nuevo nombre" });
    const requirement = updateRequirementSchema.parse({ active: false });

    expect(regulation.validUntil).toBeUndefined();
    expect(requirement.validUntil).toBeUndefined();
  });

  it("valida el contrato mínimo PATCH de alertas", () => {
    expect(
      patchAlertSchema.safeParse({
        alertId: UUID,
        comment: "Acción comprobada",
      }).success,
    ).toBe(true);
    expect(
      patchAlertSchema.safeParse({ alertId: UUID, comment: " " }).success,
    ).toBe(false);
  });

  it("valida edición completa de auditoría", () => {
    expect(
      updateAuditSchema.safeParse({
        objective: "Auditar continuidad",
        scope: "Procesos críticos",
        startDate: "2026-08-01",
        endDate: "2026-08-05",
        responsibleId: UUID,
        unitId: null,
        teamMemberIds: [],
      }).success,
    ).toBe(true);
  });

  it("mantiene las reglas condicionales al editar evaluaciones", () => {
    const base = {
      requirementId: UUID,
      unitId: UUID,
      periodStart: "2026-01-01",
      periodEnd: "2026-12-31",
      result: "no_conforme",
    };
    expect(updateEvaluationSchema.safeParse(base).success).toBe(false);
    expect(
      updateEvaluationSchema.safeParse({
        ...base,
        actionPlan: "Aplicar controles",
        planResponsibleId: UUID,
        planDeadline: "2026-10-01",
      }).success,
    ).toBe(true);
  });

  it("rechaza rangos de criticidad superpuestos o con vacíos", async () => {
    const repository = {
      findByKey: async () => ({
        clave: "criticidad_rangos",
        valor: {},
        descripcion: "Rangos",
        updated_at: new Date(),
      }),
    } as unknown as SystemParameterRepository;
    const service = new SystemParameterService(repository);

    await expect(
      service.update(
        "criticidad_rangos",
        {
          value: {
            bajo: [1, 5],
            moderado: [5, 9],
            alto: [11, 16],
            critico: [17, 25],
          },
        },
        UUID,
      ),
    ).rejects.toThrow("tipo o rango");
  });
});
