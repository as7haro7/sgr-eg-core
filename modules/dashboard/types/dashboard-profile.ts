import type { AuthPrincipal } from "@/modules/auth/types/auth.types";

export type DashboardArea =
  | "risks"
  | "mitigation"
  | "audits"
  | "compliance"
  | "alerts";

const allAreas: DashboardArea[] = [
  "risks",
  "mitigation",
  "audits",
  "compliance",
  "alerts",
];

const roleAreas: Record<string, DashboardArea[]> = {
  administrador: allAreas,
  analista_riesgos: ["risks", "mitigation", "alerts"],
  propietario_riesgo: ["risks", "mitigation", "alerts"],
  auditor_interno: ["risks", "audits", "alerts"],
  responsable_cumplimiento: ["risks", "compliance", "alerts"],
  gerencia: allAreas,
  equipo_tecnico: allAreas,
};

export function getDashboardAreas(
  principal: AuthPrincipal,
): DashboardArea[] {
  const selected = new Set<DashboardArea>();

  for (const roleName of principal.roleNames) {
    for (const area of roleAreas[roleName] ?? []) selected.add(area);
  }

  if (selected.size === 0) {
    const moduleAreas: Record<string, DashboardArea> = {
      riesgos: "risks",
      mitigacion: "mitigation",
      auditorias: "audits",
      cumplimiento: "compliance",
      alertas: "alerts",
    };
    for (const permission of principal.permissions) {
      if (permission.canRead && moduleAreas[permission.module]) {
        selected.add(moduleAreas[permission.module]);
      }
    }
  }

  return allAreas.filter((area) => selected.has(area));
}
