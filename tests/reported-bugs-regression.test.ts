import { describe, expect, it, vi } from "vitest";
import { zodResolver } from "@hookform/resolvers/zod";

import type { AuthPrincipal } from "@/modules/auth/types/auth.types";
import type { AlertRepository } from "@/modules/alerts/repositories/alert.repository";
import { AlertService } from "@/modules/alerts/services/alert.service";
import type { ListAlertsQuery } from "@/modules/alerts/validators/alert.validator";
import { createAuditSchema } from "@/modules/audits/validators/audit.validator";
import type { AuditLogRepository } from "@/modules/audit-log/repositories/audit-log.repository";
import { AuditLogService } from "@/modules/audit-log/services/audit-log.service";
import { listAuditLogQuerySchema } from "@/modules/audit-log/validators/audit-log.validator";
import { createEvaluationSchema } from "@/modules/compliance/validators/evaluation.validator";
import { DashboardRepository } from "@/modules/dashboard/repositories/dashboard.repository";
import type { DashboardFilter } from "@/modules/dashboard/validators/dashboard.validator";
import { createFindingSchema } from "@/modules/findings/validators/finding.validator";
import type { RegulationRepository } from "@/modules/regulations/repositories/regulation.repository";
import { RegulationService } from "@/modules/regulations/services/regulation.service";
import type { RiskRepository } from "@/modules/risks/repositories/risk.repository";
import { RiskService } from "@/modules/risks/services/risk.service";

const USER_ID = "10000000-0000-4000-8000-000000000001";
const UNIT_ID = "20000000-0000-4000-8000-000000000001";
const COUNTRY_ID = "30000000-0000-4000-8000-000000000001";
const ROLE_ID = "40000000-0000-4000-8000-000000000001";

function principal(
  module: "alertas" | "bitacora" | "cumplimiento" | "riesgos",
  scope: "asignado" | "global" | "unidad" | "propio",
  actions: { read?: boolean; create?: boolean; update?: boolean },
): AuthPrincipal {
  return {
    userId: USER_ID,
    name: "Usuario de prueba",
    email: "usuario@demo.sgr-eg.local",
    roleIds: [ROLE_ID],
    roleNames: [],
    unitIds: [UNIT_ID],
    primaryUnitId: UNIT_ID,
    mustChangePassword: false,
    permissions: [
      {
        roleId: ROLE_ID,
        module,
        canCreate: actions.create ?? false,
        canRead: actions.read ?? false,
        canUpdate: actions.update ?? false,
        canDeactivate: false,
        scope,
      },
    ],
  };
}

const alertQuery: ListAlertsQuery = {
  page: 1,
  pageSize: 20,
  status: undefined,
  severity: undefined,
};

describe("Regresiones de bugs reportados", () => {
  it("conserva la fecha del hallazgo como fecha simple antes de enviarla", async () => {
    const values = {
      severity: "alta" as const,
      condition: "Falta evidencia del control.",
      recommendation: "Adjuntar y validar la evidencia.",
      riskId: "",
      responsibleId: USER_ID,
      deadline: "2026-09-30",
      requiresClosingEvidence: true,
    };

    const result = await zodResolver(
      createFindingSchema,
      undefined,
      { raw: true },
    )(values, undefined, {
      fields: {},
      shouldUseNativeValidation: false,
    });

    expect(result.values).toEqual(values);
    expect(JSON.stringify(result.values)).toContain(
      '"deadline":"2026-09-30"',
    );
  });

  it("permite al auditor consultar la bitácora con alcance por unidad", async () => {
    const list = vi.fn().mockResolvedValue({ items: [], total: 0 });
    const service = new AuditLogService({
      list,
    } as unknown as AuditLogRepository);
    const query = listAuditLogQuerySchema.parse({});

    await expect(
      service.list(
        query,
        principal("bitacora", "unidad", { read: true }),
      ),
    ).resolves.toMatchObject({ items: [], total: 0 });
    expect(list).toHaveBeenCalledWith(
      query,
      expect.objectContaining({ unitIds: [UNIT_ID] }),
    );
  });

  it("envía fechas de auditoría y cumplimiento en el formato esperado por el API", async () => {
    const auditValues = {
      objective: "Revisar controles de acceso",
      scope: "Sistemas críticos de la unidad",
      startDate: "2026-08-03",
      endDate: "2026-08-07",
      responsibleId: USER_ID,
      unitId: UNIT_ID,
      teamMemberIds: [],
    };
    const evaluationValues = {
      requirementId: COUNTRY_ID,
      unitId: UNIT_ID,
      periodStart: "2026-07-01",
      periodEnd: "2026-07-31",
      result: "conforme" as const,
      observations: "Controles verificados.",
      notApplicableJustification: "",
      actionPlan: "",
      planResponsibleId: "",
      planDeadline: "",
    };
    const resolverOptions = {
      fields: {},
      shouldUseNativeValidation: false,
    };

    const auditResult = await zodResolver(
      createAuditSchema,
      undefined,
      { raw: true },
    )(auditValues, undefined, resolverOptions);
    const evaluationResult = await zodResolver(
      createEvaluationSchema,
      undefined,
      { raw: true },
    )(evaluationValues, undefined, resolverOptions);

    expect(auditResult.values).toEqual(auditValues);
    expect(evaluationResult.values).toEqual(evaluationValues);
    expect(JSON.stringify(auditResult.values)).toContain(
      '"startDate":"2026-08-03"',
    );
    expect(JSON.stringify(evaluationResult.values)).toContain(
      '"periodStart":"2026-07-01"',
    );
  });

  it("permite administrar normativas del país de una unidad autorizada", async () => {
    const repository = {
      findActiveCountry: vi.fn().mockResolvedValue({ id: COUNTRY_ID }),
      findCountryIdsForUnits: vi
        .fn()
        .mockResolvedValue([{ pais_id: COUNTRY_ID }]),
      findRegulationByUnique: vi.fn().mockResolvedValue({ id: "duplicate" }),
    } as unknown as RegulationRepository;
    const service = new RegulationService(repository);

    await expect(
      service.createRegulation(
        {
          name: "Normativa existente",
          jurisdiction: "Bolivia",
          countryId: COUNTRY_ID,
          version: "1.0",
          validFrom: new Date("2026-01-01T00:00:00Z"),
          validUntil: null,
        },
        principal("cumplimiento", "unidad", {
          read: true,
          create: true,
          update: true,
        }),
      ),
    ).rejects.toThrow("Ya existe una normativa");
  });

  it("impide que un permiso de unidad cree normativas globales", async () => {
    const repository = {
      findCountryIdsForUnits: vi
        .fn()
        .mockResolvedValue([{ pais_id: COUNTRY_ID }]),
    } as unknown as RegulationRepository;
    const service = new RegulationService(repository);

    await expect(
      service.createRegulation(
        {
          name: "Normativa global",
          jurisdiction: "Global",
          countryId: null,
          version: "1.0",
          validFrom: new Date("2026-01-01T00:00:00Z"),
          validUntil: null,
        },
        principal("cumplimiento", "unidad", { create: true }),
      ),
    ).rejects.toThrow("permiso global");
  });

  it("incluye todos los estados en la distribución cuando no hay filtro", async () => {
    const findMany = vi.fn().mockResolvedValue([
      {
        nivel_residual: { toNumber: () => 3 },
        probabilidad: 1,
        impacto: 3,
        categoria_id: "category",
        unidad_id: UNIT_ID,
        categorias_riesgo: { apetito_base: { toNumber: () => 10 } },
      },
      {
        nivel_residual: { toNumber: () => 18 },
        probabilidad: 5,
        impacto: 4,
        categoria_id: "category",
        unidad_id: UNIT_ID,
        categorias_riesgo: { apetito_base: { toNumber: () => 10 } },
      },
    ]);
    const database = {
      riesgos: { findMany },
      parametros_sistema: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
      apetitos_riesgo: { findMany: vi.fn().mockResolvedValue([]) },
    };
    const repository = new DashboardRepository(database as never);
    const filter = {
      unitId: undefined,
      countryId: undefined,
      categoryId: undefined,
      ownerId: undefined,
      status: undefined,
      periodStart: undefined,
      periodEnd: undefined,
    } satisfies DashboardFilter;

    const result = await repository.getRiskMetrics(filter);

    expect(findMany.mock.calls[0]?.[0].where.estado).toBeUndefined();
    expect(result.totalRisks).toBe(2);
    expect(result.riskDistribution.map(({ count }) => count)).toEqual([
      1, 0, 0, 1,
    ]);
  });

  it("aplica lectura global de alertas para Gerencia", async () => {
    const list = vi.fn().mockResolvedValue({
      items: [],
      total: 0,
      unreadCount: 0,
    });
    const service = new AlertService(
      { list } as unknown as AlertRepository,
    );

    const result = await service.list(
      alertQuery,
      principal("alertas", "global", { read: true }),
    );

    expect(list).toHaveBeenCalledWith(alertQuery, {});
    expect(result.viewScope).toBe("global");
  });

  it("mantiene la bandeja personal para permisos de alcance propio", async () => {
    const list = vi.fn().mockResolvedValue({
      items: [],
      total: 0,
      unreadCount: 0,
    });
    const service = new AlertService(
      { list } as unknown as AlertRepository,
    );

    await service.list(
      alertQuery,
      principal("alertas", "propio", {
        read: true,
        update: true,
      }),
    );

    expect(list.mock.calls[0]?.[1]).toEqual({
      OR: [{ destinatario_id: USER_ID }],
    });
  });

  it("impide que Gerencia atienda alertas con permiso de solo lectura", async () => {
    const repository = {
      findById: vi.fn().mockResolvedValue({
        id: "alert",
        destinatario_id: "otro-usuario",
        estado: "pendiente",
        riesgos: null,
        controles: null,
        planes_mitigacion: null,
        acciones_mitigacion: null,
        hallazgos: null,
        evaluaciones_cumplimiento: null,
      }),
      updateStatus: vi.fn(),
      addHistoryRecord: vi.fn(),
    } as unknown as AlertRepository;
    const service = new AlertService(repository);

    await expect(
      service.attend(
        "alert",
        { comment: "Intento sin autorización" },
        principal("alertas", "global", { read: true }),
      ),
    ).rejects.toThrow("No tienes permiso");
    expect(repository.updateStatus).not.toHaveBeenCalled();
  });

  it("no muestra la aceptación de riesgos a un analista sin rol de Gerencia", async () => {
    const repository = {
      findById: vi.fn().mockResolvedValue({
        id: "risk",
        estado: "evaluado",
        unidad_id: UNIT_ID,
        creado_por: USER_ID,
        propietario_id: USER_ID,
      }),
      listTransitions: vi.fn().mockResolvedValue([
        { destino: "en_tratamiento" },
        { destino: "aceptado" },
      ]),
      hasActiveRole: vi.fn().mockResolvedValue(false),
    } as unknown as RiskRepository;
    const service = new RiskService(repository);

    const transitions = await service.listAvailableTransitions(
      "risk",
      principal("riesgos", "unidad", {
        read: true,
        update: true,
      }),
    );

    expect(transitions).toEqual(["en_tratamiento"]);
    expect(transitions).not.toContain("aceptado");
  });
});
