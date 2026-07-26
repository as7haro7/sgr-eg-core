import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("Protecciones básicas de accesibilidad", () => {
  it("el diálogo conserva foco, admite Escape y declara semántica modal", () => {
    const dialog = read("components/ui/dialog.tsx");
    expect(dialog).toContain('role="dialog"');
    expect(dialog).toContain('aria-modal="true"');
    expect(dialog).toContain('event.key === "Escape"');
    expect(dialog).toContain('event.key !== "Tab"');
    expect(dialog).toContain("previousFocusRef.current?.focus()");
  });

  it("las acciones críticas tienen nombre accesible y confirmación", () => {
    const actions = read("modules/users/components/user-actions.tsx");
    expect(actions).toContain("aria-label={`Editar a ${user.name}`}");
    expect(actions).toContain("aria-label={`Desactivar a ${user.name}`}");
    expect(actions).toContain('open={dialog === "deactivate"}');
  });

  it("los formularios de evidencia generan identificadores únicos", () => {
    const evidence = read("modules/shared/components/evidence-panel.tsx");
    expect(evidence).toContain("`evidence-${entityType}-${entityId}`");
    expect(evidence).toContain('id={`${fieldPrefix}-name`}');
    expect(evidence).toContain('id={`${fieldPrefix}-url`}');
  });

  it("la navegación móvil conserva el foco y sólo marca una ruta activa", () => {
    const shell = read("components/layout/app-shell.tsx");
    expect(shell).toContain('event.key === "Escape"');
    expect(shell).toContain('event.key !== "Tab"');
    expect(shell).toContain(".sort((left, right) => right.href.length");
  });

  it("los filtros principales tienen nombres accesibles", () => {
    const filters = [
      read("app/(protected)/page.tsx"),
      read("app/(protected)/risks/page.tsx"),
      read("app/(protected)/alerts/page.tsx"),
      read("app/(protected)/settings/audit-log/page.tsx"),
    ].join("\n");
    expect(filters).toContain("Filtrar riesgos por estado");
    expect(filters).toContain("Filtrar alertas por severidad");
    expect(filters).toContain("Filtrar bitácora por entidad");
    expect(filters).toContain("Unidad de negocio");
  });

  it("respeta la preferencia de movimiento reducido", () => {
    expect(read("app/globals.css")).toContain(
      "@media (prefers-reduced-motion: reduce)",
    );
  });
});
