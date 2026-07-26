import { describe, expect, it } from "vitest";

import {
  updateBusinessUnitSchema,
  updateCountrySchema,
} from "@/modules/business-units/validators/organization.validator";
import {
  createRoleSchema,
  updateRoleSchema,
} from "@/modules/roles/validators/role.validator";
import {
  regulationFormSchema,
  updateRegulationSchema,
} from "@/modules/regulations/validators/regulation.validator";
import { updateRiskCategorySchema } from "@/modules/risks/validators/risk-configuration.validator";
import { updateUserSchema } from "@/modules/users/validators/user.validator";

const ID_A = "10000000-0000-4000-8000-000000000001";
const ID_B = "10000000-0000-4000-8000-000000000002";

describe("Contratos de administración", () => {
  it("actualiza identidad, roles y unidades del usuario", () => {
    const result = updateUserSchema.parse({
      name: "Responsable regional",
      email: "RESPONSABLE@EXAMPLE.COM",
      roleIds: [ID_A],
      units: [
        { unitId: ID_A, isPrimary: true },
        { unitId: ID_B, isPrimary: false },
      ],
    });
    expect(result.email).toBe("responsable@example.com");
    expect(result.units?.[0].isPrimary).toBe(true);
  });

  it("rechaza unidades principales o roles repetidos", () => {
    expect(
      updateUserSchema.safeParse({
        units: [
          { unitId: ID_A, isPrimary: true },
          { unitId: ID_B, isPrimary: true },
        ],
      }).success,
    ).toBe(false);
    expect(updateUserSchema.safeParse({ roleIds: [ID_A, ID_A] }).success).toBe(false);
  });

  it("valida la matriz de permisos y evita módulos repetidos", () => {
    const permission = {
      moduleCode: "riesgos",
      canCreate: true,
      canRead: true,
      canUpdate: true,
      canDeactivate: false,
      scope: "unidad" as const,
    };
    expect(
      createRoleSchema.safeParse({
        name: "gestor",
        description: "Gestión regional",
        permissions: [permission],
      }).success,
    ).toBe(true);
    expect(
      createRoleSchema.safeParse({
        name: "duplicado",
        description: null,
        permissions: [permission, permission],
      }).success,
    ).toBe(false);
    expect(updateRoleSchema.safeParse({}).success).toBe(false);
  });

  it("actualiza todos los campos de catálogos", () => {
    expect(updateCountrySchema.parse({ name: "Bolivia", isoCode: "bo" })).toEqual({
      name: "Bolivia",
      isoCode: "BO",
    });
    expect(
      updateBusinessUnitSchema.safeParse({
        name: "Operaciones",
        countryId: ID_A,
        currency: "bob",
      }).success,
    ).toBe(true);
    expect(
      updateRiskCategorySchema.safeParse({
        name: "Operacional",
        description: "Procesos internos",
        baseAppetite: 12.5,
      }).success,
    ).toBe(true);
  });

  it("edita datos y estado de una normativa", () => {
    const form = regulationFormSchema.parse({
      name: "Norma de prueba",
      jurisdiction: "Nacional",
      countryId: ID_A,
      version: "2.0",
      validFrom: "2026-01-01",
      validUntil: "2026-12-31",
      status: "derogada",
    });
    expect(form.status).toBe("derogada");
    expect(
      updateRegulationSchema.safeParse({
        status: "vigente",
        validUntil: "",
      }).success,
    ).toBe(true);
  });
});
