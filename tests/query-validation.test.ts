import { describe, expect, it } from "vitest";

import { listAuditLogQuerySchema } from "@/modules/audit-log/validators/audit-log.validator";
import { securePasswordSchema } from "@/modules/auth/validators/password.validator";
import { dashboardFilterSchema } from "@/modules/dashboard/validators/dashboard.validator";
import { listRisksQuerySchema } from "@/modules/risks/validators/risk.validator";
import { parsePageQuery } from "@/modules/shared/validators/query.validator";

describe("Validación de filtros GET", () => {
  it("acepta fechas vacías del formulario del dashboard", () => {
    expect(
      dashboardFilterSchema.parse({
        periodStart: "",
        periodEnd: "",
        unitId: "",
        countryId: "",
        categoryId: "",
        ownerId: "",
        status: "",
      }),
    ).toEqual({
      periodStart: undefined,
      periodEnd: undefined,
      unitId: undefined,
      countryId: undefined,
      categoryId: undefined,
      ownerId: undefined,
      status: undefined,
    });
  });

  it("convierte un periodo válido a límites UTC", () => {
    const result = dashboardFilterSchema.parse({
      periodStart: "2026-01-01",
      periodEnd: "2026-01-31",
    });
    expect(result.periodStart?.toISOString()).toBe("2026-01-01T00:00:00.000Z");
    expect(result.periodEnd?.toISOString()).toBe("2026-01-31T23:59:59.999Z");
  });

  it("rechaza fechas imposibles y periodos invertidos", () => {
    expect(
      dashboardFilterSchema.safeParse({ periodStart: "2026-99-01" }).success,
    ).toBe(false);
    expect(
      dashboardFilterSchema.safeParse({
        periodStart: "2026-02-01",
        periodEnd: "2026-01-01",
      }).success,
    ).toBe(false);
  });

  it("normaliza paginación y filtros vacíos en listados", () => {
    expect(
      listRisksQuerySchema.parse({
        page: "",
        pageSize: "",
        categoryId: "",
        status: "",
      }),
    ).toMatchObject({ page: 1, pageSize: 20 });
    expect(
      listAuditLogQuerySchema.parse({
        startDate: "",
        endDate: "",
        userId: "",
      }),
    ).toMatchObject({ page: 1, pageSize: 20 });
  });

  it("las páginas recuperan valores seguros ante una URL manipulada", () => {
    expect(
      parsePageQuery(dashboardFilterSchema, {
        periodStart: "fecha-inválida",
      }),
    ).toEqual({});
  });

  it("aplica la misma política segura a contraseñas administrativas", () => {
    expect(securePasswordSchema.safeParse("corta").success).toBe(false);
    expect(securePasswordSchema.safeParse("solo-minusculas-2026").success).toBe(
      false,
    );
    expect(securePasswordSchema.safeParse("TemporalSGR2026!").success).toBe(
      true,
    );
  });
});
