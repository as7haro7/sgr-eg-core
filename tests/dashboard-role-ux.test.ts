import { describe, expect, it } from "vitest";

import { getVisibleNavigation } from "@/config/navigation";
import type {
  AuthPermission,
  AuthPrincipal,
} from "@/modules/auth/types/auth.types";
import { getDashboardAreas } from "@/modules/dashboard/types/dashboard-profile";

function principal(
  roleName: string,
  permissions: AuthPermission[],
): AuthPrincipal {
  return {
    userId: "10000000-0000-4000-8000-000000000001",
    name: "Usuario",
    email: "usuario@example.com",
    roleIds: ["20000000-0000-4000-8000-000000000001"],
    roleNames: [roleName],
    unitIds: ["30000000-0000-4000-8000-000000000001"],
    primaryUnitId: "30000000-0000-4000-8000-000000000001",
    mustChangePassword: false,
    permissions,
  };
}

function permission(
  module: string,
  actions: Partial<
    Pick<
      AuthPermission,
      "canCreate" | "canRead" | "canUpdate" | "canDeactivate"
    >
  > = {},
): AuthPermission {
  return {
    roleId: "20000000-0000-4000-8000-000000000001",
    module,
    canCreate: actions.canCreate ?? false,
    canRead: actions.canRead ?? true,
    canUpdate: actions.canUpdate ?? false,
    canDeactivate: actions.canDeactivate ?? false,
    scope: "unidad",
  };
}

describe("Dashboard y navegación por rol", () => {
  it("enfoca al analista en riesgos y oculta pantallas administrativas", () => {
    const analyst = principal("analista_riesgos", [
      permission("reportes"),
      permission("riesgos", { canCreate: true, canUpdate: true }),
      permission("mitigacion", { canCreate: true, canUpdate: true }),
      permission("alertas", { canUpdate: true }),
      permission("usuarios"),
      permission("organizacion"),
    ]);

    expect(getDashboardAreas(analyst)).toEqual([
      "risks",
      "mitigation",
      "alerts",
    ]);
    expect(getVisibleNavigation(analyst).map(({ href }) => href)).toEqual([
      "/",
      "/risks",
      "/alerts",
    ]);
  });

  it("mantiene para Gerencia una visión ejecutiva de todas las áreas", () => {
    const management = principal("gerencia", [
      permission("reportes"),
      permission("riesgos"),
      permission("mitigacion"),
      permission("auditorias"),
      permission("cumplimiento"),
      permission("alertas"),
    ]);

    expect(getDashboardAreas(management)).toEqual([
      "risks",
      "mitigation",
      "audits",
      "compliance",
      "alerts",
    ]);
  });

  it("muestra administración únicamente cuando existe permiso de gestión", () => {
    const administrator = principal("administrador", [
      permission("reportes"),
      permission("usuarios", {
        canCreate: true,
        canUpdate: true,
        canDeactivate: true,
      }),
      permission("organizacion", {
        canCreate: true,
        canUpdate: true,
        canDeactivate: true,
      }),
      permission("alertas"),
    ]);

    expect(getVisibleNavigation(administrator).map(({ href }) => href)).toEqual(
      ["/", "/users", "/organization", "/settings", "/alerts"],
    );
  });
});
