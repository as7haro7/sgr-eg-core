import { describe, expect, it } from "vitest";

import { AuthorizationService } from "@/modules/auth/services/authorization.service";
import { PasswordHasher } from "@/modules/auth/services/password-hasher.service";
import { TokenService } from "@/modules/auth/services/token.service";
import type { AuthPrincipal } from "@/modules/auth/types/auth.types";
import { attendAlertSchema } from "@/modules/alerts/validators/alert.validator";
import { createEvaluationSchema } from "@/modules/compliance/validators/evaluation.validator";
import { dashboardFilterSchema } from "@/modules/dashboard/validators/dashboard.validator";
import { createFindingSchema } from "@/modules/findings/validators/finding.validator";
import {
  classifyRiskLevel,
  parseCriticalityRanges,
} from "@/modules/risks/constants/criticality";
import { calculateRiskLevels } from "@/modules/risks/services/risk-calculation.service";
import { transitionRiskSchema } from "@/modules/risks/validators/risk.validator";
import { createFileEvidenceMetadataSchema } from "@/modules/shared/validators/evidence.validator";

const USER_ID = "10000000-0000-4000-8000-000000000001";
const UNIT_ID = "20000000-0000-4000-8000-000000000001";
const OTHER_UNIT_ID = "20000000-0000-4000-8000-000000000002";
const ENTITY_ID = "30000000-0000-4000-8000-000000000001";

function principal(): AuthPrincipal {
  return {
    userId: USER_ID,
    name: "Usuario de prueba",
    email: "test@example.com",
    roleIds: [],
    roleNames: [],
    unitIds: [UNIT_ID],
    primaryUnitId: UNIT_ID,
    mustChangePassword: false,
    permissions: [
      {
        roleId: ENTITY_ID,
        module: "riesgos",
        canCreate: true,
        canRead: true,
        canUpdate: true,
        canDeactivate: false,
        scope: "unidad",
      },
    ],
  };
}

describe("Casos mínimos CP-01 a CP-10", () => {
  it("CP-01 cifra contraseñas y verifica sin guardar texto plano", async () => {
    const hasher = new PasswordHasher();
    const hash = await hasher.hash("DemoSGR2026!");
    expect(hash).not.toContain("DemoSGR2026!");
    await expect(hasher.verify("DemoSGR2026!", hash)).resolves.toBe(true);
    await expect(hasher.verify("incorrecta", hash)).resolves.toBe(false);
  });

  it("CP-02 rechaza un JWT expirado", () => {
    process.env.AUTH_JWT_SECRET = "x".repeat(48);
    const tokens = new TokenService();
    const token = tokens.create(
      USER_ID,
      ENTITY_ID,
      new Date("2026-01-01T00:00:00Z"),
      new Date("2026-01-01T00:30:00Z"),
    );
    expect(() =>
      tokens.verify(token, new Date("2026-01-01T00:31:00Z")),
    ).toThrow("expirado");
  });

  it("CP-03 aplica RBAC por unidad en el servidor", () => {
    const authorization = new AuthorizationService();
    expect(
      authorization.isAllowed(principal(), "riesgos", "update", {
        unitId: UNIT_ID,
      }),
    ).toBe(true);
    expect(
      authorization.isAllowed(principal(), "riesgos", "update", {
        unitId: OTHER_UNIT_ID,
      }),
    ).toBe(false);
  });

  it("CP-04 calcula riesgo inherente y residual compuesto", () => {
    expect(calculateRiskLevels(5, 4, [50, 20])).toEqual({
      inherentLevel: 20,
      residualLevel: 8,
      accumulatedEffectiveness: 60,
    });
  });

  it("CP-05 exige justificación y revisión al aceptar un riesgo", () => {
    expect(
      transitionRiskSchema.safeParse({ destination: "aceptado" }).success,
    ).toBe(false);
    expect(
      transitionRiskSchema.safeParse({
        destination: "aceptado",
        justification: "Aprobado por gerencia",
        reviewDate: "2026-12-31",
      }).success,
    ).toBe(true);
  });

  it("CP-06 obliga evidencia de cierre en hallazgos críticos", () => {
    const result = createFindingSchema.safeParse({
      severity: "critica",
      condition: "Condición crítica",
      recommendation: "Corregir",
      requiresClosingEvidence: false,
    });
    expect(result.success).toBe(false);
  });

  it("CP-07 valida no aplicable y no conforme", () => {
    const base = {
      requirementId: ENTITY_ID,
      unitId: UNIT_ID,
      periodStart: "2026-01-01",
      periodEnd: "2026-12-31",
    };
    expect(
      createEvaluationSchema.safeParse({
        ...base,
        result: "no_aplicable",
      }).success,
    ).toBe(false);
    expect(
      createEvaluationSchema.safeParse({
        ...base,
        result: "no_conforme",
      }).success,
    ).toBe(false);
  });

  it("CP-08 exige comentario para atender una alerta", () => {
    expect(attendAlertSchema.safeParse({ comment: " " }).success).toBe(false);
    expect(
      attendAlertSchema.safeParse({ comment: "Acción verificada" }).success,
    ).toBe(true);
  });

  it("CP-09 rechaza extensiones ejecutables como evidencia", () => {
    expect(
      createFileEvidenceMetadataSchema.safeParse({
        entityType: "risk",
        entityId: ENTITY_ID,
        name: "evidencia.exe",
        mimeType: "text/plain",
        sizeBytes: 10,
      }).success,
    ).toBe(false);
  });

  it("CP-10 combina filtros y respeta criticidad configurable", () => {
    const filters = dashboardFilterSchema.parse({
      unitId: UNIT_ID,
      countryId: ENTITY_ID,
      categoryId: ENTITY_ID,
      ownerId: USER_ID,
      status: "abierto",
      periodStart: "2026-01-01",
      periodEnd: "2026-12-31",
    });
    expect(filters.unitId).toBe(UNIT_ID);
    expect(filters.countryId).toBe(ENTITY_ID);
    const ranges = parseCriticalityRanges({
      bajo: [1, 4],
      moderado: [5, 9],
      alto: [10, 16],
      critico: [17, 25],
    });
    expect(classifyRiskLevel(16, ranges)).toBe("high");
    expect(classifyRiskLevel(17, ranges)).toBe("critical");
  });
});
