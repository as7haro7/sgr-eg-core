import { describe, expect, it, vi } from "vitest";

import type { AlertRepository } from "@/modules/alerts/repositories/alert.repository";
import { AlertEngineService } from "@/modules/alerts/services/alert-engine.service";
import type { AlertEmailService } from "@/modules/alerts/services/alert-email.service";

describe("Destinatarios del motor AL-01", () => {
  it("notifica al propietario, analista de unidad y gerencia sin duplicar", async () => {
    const created: Array<{
      regla_codigo: string;
      destinatario_id: string;
      severidad: string;
    }> = [];
    const repository = {
      findRisksForAlertEvaluation: vi.fn().mockResolvedValue([
        {
          id: "risk",
          propietario_id: "owner",
          creado_por: "creator",
          categoria_id: "category",
          unidad_id: "unit",
          codigo: "R-2026-9999",
          nivel_residual: { toNumber: () => 18 },
          categorias_riesgo: {
            apetito_base: { toNumber: () => 10 },
          },
          planes_mitigacion: [{ id: "plan" }],
        },
      ]),
      findEffectiveAppetites: vi.fn().mockResolvedValue([]),
      findOverdueMitigationPlans: vi.fn().mockResolvedValue([]),
      findOverdueMitigationActions: vi.fn().mockResolvedValue([]),
      findCriticalFindingsWithoutResponse: vi.fn().mockResolvedValue([]),
      findNonCompliantEvaluations: vi.fn().mockResolvedValue([]),
      findAlertDaysParameter: vi.fn().mockResolvedValue({ valor: 30 }),
      findComplianceRecipients: vi.fn().mockResolvedValue([]),
      findKeyControls: vi.fn().mockResolvedValue([]),
      findCriticalityRangesParameter: vi.fn().mockResolvedValue({
        valor: {
          bajo: [1, 4],
          moderado: [5, 9],
          alto: [10, 19],
          critico: [20, 25],
        },
      }),
      findExpiringRegulations: vi.fn().mockResolvedValue([]),
      findExpiringRequirements: vi.fn().mockResolvedValue([]),
      findControlUpdateHistory: vi.fn().mockResolvedValue([]),
      findRecipientsByRolesForUnits: vi.fn(
        async (roles: string[]) => {
          if (roles.includes("analista_riesgos")) {
            return [
              {
                id: "analyst",
                usuario_unidades: [{ unidad_id: "unit" }],
              },
            ];
          }
          return [];
        },
      ),
      findRecipientsByRoles: vi.fn(
        async (roles: string[]) => {
          if (roles.includes("gerencia")) return [{ id: "manager" }];
          if (roles.includes("administrador")) return [{ id: "admin" }];
          return [];
        },
      ),
      createManyAlerts: vi.fn(async (alerts) => {
        created.push(...alerts);
        return [];
      }),
      findRecipientEmails: vi.fn().mockResolvedValue([]),
    } as unknown as AlertRepository;
    const email = {
      notify: vi.fn().mockResolvedValue(undefined),
    } as unknown as AlertEmailService;

    await new AlertEngineService(repository, email).runEngine();

    expect(
      created
        .filter(({ regla_codigo }) => regla_codigo === "AL-01")
        .map(({ destinatario_id }) => destinatario_id)
        .sort(),
    ).toEqual(["analyst", "manager", "owner"]);
    expect(
      created.find(({ regla_codigo }) => regla_codigo === "AL-01")
        ?.severidad,
    ).toBe("alta");
  });
});
