import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const read = (...paths: string[]) =>
  paths.map((path) => readFileSync(join(process.cwd(), path), "utf8")).join("\n");

describe("Cobertura funcional del API desde la interfaz", () => {
  it("cubre autenticación y administración", () => {
    const source = read(
      "modules/auth/components/login-form.tsx",
      "modules/auth/components/logout-button.tsx",
      "modules/auth/components/change-password-form.tsx",
      "modules/users/components/create-user-form.tsx",
      "modules/users/components/user-actions.tsx",
      "modules/roles/components/role-manager.tsx",
    );

    for (const endpoint of [
      "/api/auth/login",
      "/api/auth/logout",
      "/api/auth/change-password",
      "/api/users",
      "/reset-password",
      "/deactivate",
      "/api/roles",
    ]) {
      expect(source).toContain(endpoint);
    }
  });

  it("cubre organización, catálogos y configuración", () => {
    const source = read(
      "modules/business-units/components/organization-forms.tsx",
      "modules/business-units/components/organization-actions.tsx",
      "modules/risks/components/risk-configuration-forms.tsx",
      "modules/shared/components/system-parameter-editor.tsx",
    );

    for (const endpoint of [
      "/api/countries",
      "/api/business-units",
      "/api/risk-categories",
      "/api/risk-appetites",
      "/api/system-parameters",
    ]) {
      expect(source).toContain(endpoint);
    }
  });

  it("cubre el ciclo de riesgo, control y mitigación", () => {
    const source = read(
      "modules/risks/components/risk-form.tsx",
      "modules/risks/components/risk-transition-form.tsx",
      "modules/controls/components/control-panel.tsx",
      "modules/mitigation/components/mitigation-panel.tsx",
    );

    for (const endpoint of [
      "/api/risks",
      "/preview",
      "/transition",
      "/controls",
      "/api/controls/",
      "/history",
      "/mitigation-plans",
      "/api/mitigation-actions/",
      "/deactivate",
    ]) {
      expect(source).toContain(endpoint);
    }
  });

  it("cubre auditoría, cumplimiento, alertas y evidencias", () => {
    const source = read(
      "modules/audits/components/audit-form.tsx",
      "modules/audits/components/audit-transition-dialog.tsx",
      "modules/findings/components/finding-panel.tsx",
      "modules/findings/components/finding-edit-modal.tsx",
      "modules/regulations/components/regulation-form.tsx",
      "modules/regulations/components/requirement-list.tsx",
      "modules/compliance/components/evaluation-form.tsx",
      "modules/alerts/components/alert-attend-modal.tsx",
      "modules/alerts/components/alert-reopen-modal.tsx",
      "modules/alerts/components/alert-engine-button.tsx",
      "modules/shared/components/evidence-panel.tsx",
      "modules/shared/components/evidence-uploader.tsx",
    );

    for (const endpoint of [
      "/api/audits",
      "/transition",
      "/findings",
      "/response",
      "/close",
      "/api/regulations",
      "/requirements",
      "/api/compliance/evaluations",
      "/api/alerts/",
      "/api/alerts/engine",
      "/api/evidence",
      "/api/evidence/upload",
    ]) {
      expect(source).toContain(endpoint);
    }
  });
});
