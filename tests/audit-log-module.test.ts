import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it, vi } from "vitest";

import type { AuditLogRepository } from "@/modules/audit-log/repositories/audit-log.repository";
import { AuditLogService } from "@/modules/audit-log/services/audit-log.service";
import {
  auditActionLabel,
  auditEntityLabel,
  formatAuditDetails,
} from "@/modules/audit-log/utils/audit-log-display";
import { listAuditLogQuerySchema } from "@/modules/audit-log/validators/audit-log.validator";
import type { AuthPrincipal } from "@/modules/auth/types/auth.types";

const USER_ID = "10000000-0000-4000-8000-000000000001";
const UNIT_ID = "20000000-0000-4000-8000-000000000001";

function principal(
  scope: "asignado" | "global" | "propio" | "unidad",
): AuthPrincipal {
  return {
    userId: USER_ID,
    name: "Usuario de prueba",
    email: "usuario@example.com",
    roleIds: [],
    roleNames: [],
    unitIds: [UNIT_ID],
    primaryUnitId: UNIT_ID,
    mustChangePassword: false,
    permissions: [
      {
        roleId: USER_ID,
        module: "bitacora",
        canCreate: false,
        canRead: true,
        canUpdate: false,
        canDeactivate: false,
        scope,
      },
    ],
  };
}

describe("Módulo de Bitácora", () => {
  it.each([
    ["global", undefined, "global"],
    ["unidad", { unitIds: [UNIT_ID] }, "unidad"],
    ["asignado", { assignedUserId: USER_ID }, "asignado"],
    ["propio", { ownUserId: USER_ID }, "propio"],
  ] as const)(
    "aplica correctamente el alcance %s",
    async (scope, expectedScope, expectedViewScope) => {
      const list = vi.fn().mockResolvedValue({ items: [], total: 762 });
      const service = new AuditLogService({
        list,
      } as unknown as AuditLogRepository);

      const result = await service.list(
        listAuditLogQuerySchema.parse({ pageSize: 100 }),
        principal(scope),
      );

      expect(list).toHaveBeenCalledWith(
        expect.objectContaining({ pageSize: 100 }),
        expectedScope
          ? expect.objectContaining(expectedScope)
          : undefined,
      );
      expect(result.viewScope).toBe(expectedViewScope);
      expect(result.totalPages).toBe(8);
    },
  );

  it("convierte un cambio automático en valores Antes y Después", () => {
    const details = formatAuditDetails({
      anterior: {
        estado: "identificado",
        updated_at: "2026-07-28T12:00:00.000Z",
        token_hash: "secreto",
      },
      nuevo: {
        estado: "evaluado",
        updated_at: "2026-07-29T12:00:00.000Z",
        token_hash: "otro-secreto",
      },
    });

    expect(details).toEqual([
      {
        label: "Estado",
        previous: "Identificado",
        current: "Evaluado",
      },
      expect.objectContaining({
        label: "Última modificación",
      }),
    ]);
    expect(JSON.stringify(details)).not.toContain("secreto");
  });

  it("formatea detalles funcionales y etiquetas técnicas", () => {
    expect(
      formatAuditDetails({
        sesiones_revocadas: true,
        unidades: [{ unidad_id: UNIT_ID, es_principal: true }],
      }),
    ).toEqual([
      { label: "Sesiones revocadas", value: "Sí" },
      { label: "Unidades 1 · Unidad", value: UNIT_ID },
      { label: "Unidades 1 · Unidad principal", value: "Sí" },
    ]);
    expect(auditActionLabel("insert")).toBe("Creación");
    expect(auditEntityLabel("evaluaciones_cumplimiento")).toBe(
      "Evaluación de cumplimiento",
    );
  });

  it("muestra nombre del sistema y elimina el JSON crudo de la vista", () => {
    const login = readFileSync(
      join(process.cwd(), "app/login/page.tsx"),
      "utf8",
    );
    const auditLog = readFileSync(
      join(
        process.cwd(),
        "app/(protected)/settings/audit-log/page.tsx",
      ),
      "utf8",
    );

    expect(login).toContain(
      "Sistema de Gestión de Riesgos Empresariales Globales",
    );
    expect(auditLog).toContain("<AuditLogDetails");
    expect(auditLog).not.toContain("JSON.stringify(log.details");
  });
});
