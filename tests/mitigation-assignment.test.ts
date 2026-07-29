import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it, vi } from "vitest";

import type { AuthPrincipal } from "@/modules/auth/types/auth.types";
import type { MitigationRepository } from "@/modules/mitigation/repositories/mitigation.repository";
import { MitigationService } from "@/modules/mitigation/services/mitigation.service";

const USER_ID = "10000000-0000-4000-8000-000000000001";
const PLAN_RESPONSIBLE_ID = "10000000-0000-4000-8000-000000000002";
const ACTION_RESPONSIBLE_ID = "10000000-0000-4000-8000-000000000003";
const UNIT_ID = "20000000-0000-4000-8000-000000000001";
const ROLE_ID = "30000000-0000-4000-8000-000000000001";
const RISK_ID = "40000000-0000-4000-8000-000000000001";
const PLAN_ID = "50000000-0000-4000-8000-000000000001";
const ACTION_ID = "60000000-0000-4000-8000-000000000001";

function assignedPrincipal(): AuthPrincipal {
  return {
    userId: USER_ID,
    name: "Propietario",
    email: "propietario@demo.local",
    roleIds: [ROLE_ID],
    roleNames: ["propietario_riesgo"],
    unitIds: [UNIT_ID],
    primaryUnitId: UNIT_ID,
    mustChangePassword: false,
    permissions: [
      {
        roleId: ROLE_ID,
        module: "mitigacion",
        canCreate: false,
        canRead: true,
        canUpdate: true,
        canDeactivate: false,
        scope: "asignado",
      },
    ],
  };
}

const risk = {
  unidad_id: UNIT_ID,
  propietario_id: USER_ID,
  creado_por: ACTION_RESPONSIBLE_ID,
  deleted_at: null,
};

describe("Asignación individual de planes y acciones", () => {
  it("impide que el propietario del riesgo complete una acción asignada a otra persona", async () => {
    const repository = {
      findActionById: vi.fn().mockResolvedValue({
        id: ACTION_ID,
        responsable_id: ACTION_RESPONSIBLE_ID,
        planes_mitigacion: {
          id: PLAN_ID,
          responsable_id: PLAN_RESPONSIBLE_ID,
          deleted_at: null,
          riesgos: risk,
        },
      }),
    } as unknown as MitigationRepository;
    const service = new MitigationService(repository);

    await expect(
      service.updateAction(
        ACTION_ID,
        { status: "completado", progress: 100 },
        assignedPrincipal(),
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN", statusCode: 403 });
  });

  it("impide modificar un plan cuando pertenece a otro responsable", async () => {
    const repository = {
      findPlanById: vi.fn().mockResolvedValue({
        id: PLAN_ID,
        responsable_id: PLAN_RESPONSIBLE_ID,
        riesgos: risk,
      }),
    } as unknown as MitigationRepository;
    const service = new MitigationService(repository);

    await expect(
      service.updatePlan(
        PLAN_ID,
        { status: "completado", progress: 100 },
        assignedPrincipal(),
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN", statusCode: 403 });
  });

  it("habilita únicamente la acción asignada al usuario en los datos de interfaz", async () => {
    const repository = {
      findRiskContext: vi.fn().mockResolvedValue(risk),
      listByRisk: vi.fn().mockResolvedValue([
        {
          id: PLAN_ID,
          descripcion: "Plan de continuidad",
          fecha_limite: new Date("2026-09-30"),
          avance: { toNumber: () => 40 },
          estado: "activo",
          created_at: new Date(),
          usuarios: {
            id: PLAN_RESPONSIBLE_ID,
            nombre: "Responsable del plan",
          },
          acciones_mitigacion: [
            {
              id: ACTION_ID,
              descripcion: "Acción propia",
              fecha_limite: new Date("2026-09-15"),
              avance: { toNumber: () => 20 },
              estado: "activo",
              created_at: new Date(),
              usuarios: { id: USER_ID, nombre: "Propietario" },
            },
          ],
        },
      ]),
    } as unknown as MitigationRepository;
    const service = new MitigationService(repository);

    const plans = await service.listByRisk(RISK_ID, assignedPrincipal());

    expect(plans[0]).toMatchObject({
      canUpdate: false,
      canDeactivate: false,
      canCreateActions: false,
    });
    expect(plans[0]?.actions[0]).toMatchObject({
      canUpdate: true,
      canDeactivate: false,
    });
  });

  it("mantiene el rediseño limitado a la ruta de login", () => {
    const login = readFileSync(
      join(process.cwd(), "app/login/page.tsx"),
      "utf8",
    );

    expect(login).toContain("Sistema de Gestión de Riesgos Empresariales Globales");
    expect(login).toContain("bg-[linear-gradient");
    expect(login).toContain("<LoginForm />");
  });
});
