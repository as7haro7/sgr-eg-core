import { describe, expect, it } from "vitest";

import { AuthorizationService } from "@/modules/auth/services/authorization.service";
import type { AuthPrincipal } from "@/modules/auth/types/auth.types";

const USER = "10000000-0000-4000-8000-000000000001";
const UNIT = "20000000-0000-4000-8000-000000000001";
const OTHER = "20000000-0000-4000-8000-000000000002";

function principal(scope: "global" | "unidad" | "propio" | "asignado"): AuthPrincipal {
  return {
    userId: USER,
    name: "Prueba",
    email: "test@example.com",
    roleIds: [],
    roleNames: [],
    unitIds: [UNIT],
    primaryUnitId: UNIT,
    mustChangePassword: false,
    permissions: [{
      roleId: "30000000-0000-4000-8000-000000000001",
      module: "riesgos",
      canCreate: true,
      canRead: true,
      canUpdate: true,
      canDeactivate: true,
      scope,
    }],
  };
}

describe("Alcances RBAC", () => {
  const authorization = new AuthorizationService();

  it("global permite cualquier unidad", () => {
    expect(authorization.isAllowed(principal("global"), "riesgos", "update", { unitId: OTHER })).toBe(true);
  });

  it("unidad limita a unidades asignadas", () => {
    expect(authorization.isAllowed(principal("unidad"), "riesgos", "read", { unitId: UNIT })).toBe(true);
    expect(authorization.isAllowed(principal("unidad"), "riesgos", "read", { unitId: OTHER })).toBe(false);
  });

  it("propio exige autoría y asignado exige asignación", () => {
    expect(authorization.isAllowed(principal("propio"), "riesgos", "update", { ownerId: USER })).toBe(true);
    expect(authorization.isAllowed(principal("propio"), "riesgos", "update", { ownerId: OTHER })).toBe(false);
    expect(authorization.isAllowed(principal("asignado"), "riesgos", "update", { assigneeIds: [USER] })).toBe(true);
    expect(authorization.isAllowed(principal("asignado"), "riesgos", "update", { assigneeIds: [OTHER] })).toBe(false);
  });
});
