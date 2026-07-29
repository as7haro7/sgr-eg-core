import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const read = (path: string) =>
  readFileSync(join(process.cwd(), path), "utf8");

describe("Contratos de fechas entre formularios y API", () => {
  it.each([
    ["modules/audits/components/audit-form.tsx", "createAuditSchema"],
    [
      "modules/compliance/components/evaluation-form.tsx",
      "createEvaluationSchema",
    ],
    ["modules/findings/components/finding-panel.tsx", "createFindingSchema"],
    [
      "modules/mitigation/components/mitigation-panel.tsx",
      "createMitigationPlanSchema",
    ],
    [
      "modules/mitigation/components/mitigation-panel.tsx",
      "mitigationEditorSchema",
    ],
    [
      "modules/regulations/components/regulation-form.tsx",
      "regulationFormSchema",
    ],
    [
      "modules/risks/components/risk-configuration-forms.tsx",
      "createRiskAppetiteSchema",
    ],
    [
      "modules/risks/components/risk-transition-form.tsx",
      "transitionRiskSchema",
    ],
  ])("%s conserva los valores HTML al usar %s", (path, schema) => {
    expect(read(path)).toContain(
      `zodResolver(${schema}, undefined, { raw: true })`,
    );
  });

  it("la edición de hallazgos envía AAAA-MM-DD sin convertir a ISO", () => {
    const source = read(
      "modules/findings/components/finding-edit-modal.tsx",
    );

    expect(source).toContain("deadline: data.deadline || null");
    expect(source).not.toContain(
      "new Date(data.deadline).toISOString()",
    );
  });
});
