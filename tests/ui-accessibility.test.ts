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
});
