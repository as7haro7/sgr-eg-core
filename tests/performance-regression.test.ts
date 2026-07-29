import { readFileSync } from "node:fs";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import type { AuthPrincipal } from "@/modules/auth/types/auth.types";
import type { EvidenceRepository } from "@/modules/shared/repositories/evidence.repository";
import { EvidenceService } from "@/modules/shared/services/evidence.service";

const { runEngine } = vi.hoisted(() => ({
  runEngine: vi.fn().mockResolvedValue({ evaluated: 0, created: 0 }),
}));

vi.mock("@/modules/alerts/services/alert-engine.service", () => ({
  AlertEngineService: class {
    runEngine = runEngine;
  },
}));

const USER_ID = "10000000-0000-4000-8000-000000000001";
const AUDIT_ID = "20000000-0000-4000-8000-000000000001";
const FINDING_ID = "30000000-0000-4000-8000-000000000001";

function principal(): AuthPrincipal {
  return {
    userId: USER_ID,
    name: "Auditor",
    email: "auditor@demo.local",
    roleIds: [],
    roleNames: [],
    unitIds: [],
    primaryUnitId: null,
    mustChangePassword: false,
    permissions: [
      {
        roleId: "40000000-0000-4000-8000-000000000001",
        module: "auditorias",
        canCreate: false,
        canRead: true,
        canUpdate: false,
        canDeactivate: false,
        scope: "global",
      },
    ],
  };
}

afterEach(() => {
  vi.useRealTimers();
  runEngine.mockClear();
});

describe("Regresiones de rendimiento", () => {
  it("agrupa las evidencias de hallazgos en una sola consulta", async () => {
    const repository = {
      findAudit: vi.fn().mockResolvedValue({
        unidad_id: null,
        responsable_id: USER_ID,
        auditoria_equipo: [],
      }),
      listAuditFindings: vi.fn().mockResolvedValue([]),
    } as unknown as EvidenceRepository;
    const service = new EvidenceService(repository);

    await expect(
      service.listAuditFindings(AUDIT_ID, [FINDING_ID], principal()),
    ).resolves.toEqual({ [FINDING_ID]: [] });
    expect(repository.findAudit).toHaveBeenCalledTimes(1);
    expect(repository.listAuditFindings).toHaveBeenCalledTimes(1);
  });

  it("consolida cambios cercanos en una sola evaluación de alertas", async () => {
    vi.useFakeTimers();
    const { scheduleAlertEvaluation } = await import(
      "@/modules/alerts/services/alert-trigger.service"
    );

    scheduleAlertEvaluation();
    scheduleAlertEvaluation();
    scheduleAlertEvaluation();

    await vi.advanceTimersByTimeAsync(1_999);
    expect(runEngine).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(runEngine).toHaveBeenCalledTimes(1);
  });

  it("no consulta evidencias ni transiciones duplicadas en vistas simples", () => {
    const auditPage = readFileSync(
      join(process.cwd(), "app/(protected)/audits/[auditId]/page.tsx"),
      "utf8",
    );
    const auditEditPage = readFileSync(
      join(process.cwd(), "app/(protected)/audits/[auditId]/edit/page.tsx"),
      "utf8",
    );
    const riskPage = readFileSync(
      join(process.cwd(), "app/(protected)/risks/[riskId]/page.tsx"),
      "utf8",
    );

    expect(auditPage).not.toContain(
      "auditService.listAvailableTransitions",
    );
    expect(auditEditPage).not.toContain(
      "auditService.listAvailableTransitions",
    );
    expect(auditPage).toContain('activeSection === "evidence"');
    expect(riskPage).toContain('activeSection === "evidence"');
    expect(riskPage).toContain("riskService.getDetail");
  });
});
