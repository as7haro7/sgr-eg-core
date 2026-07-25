import { AppError } from "@/lib/app-error";
import { withAuditContext } from "@/lib/transaction";
import { AuthorizationService } from "@/modules/auth/services/authorization.service";
import { scheduleAlertEvaluation } from "@/modules/alerts/services/alert-trigger.service";
import type { AuthPrincipal } from "@/modules/auth/types/auth.types";
import { controlStatuses } from "@/modules/controls/constants/control";
import {
  ControlRepository,
} from "@/modules/controls/repositories/control.repository";
import type {
  ControlHistoryEntry,
  ControlSummary,
  RiskControlOverview,
} from "@/modules/controls/types/control.types";
import type {
  CreateControlInput,
  UpdateControlInput,
} from "@/modules/controls/validators/control.validator";

type ControlRecord = Awaited<
  ReturnType<ControlRepository["create"]>
>;
type RiskContext = NonNullable<
  Awaited<ReturnType<ControlRepository["findRiskContext"]>>
>;

function mapControl(
  control: ControlRecord,
): ControlSummary {
  return {
    id: control.id,
    description: control.descripcion,
    type: control.tipo,
    effectiveness: control.efectividad.toNumber(),
    isKey: control.es_clave,
    status: control.estado,
    updatedAt: control.updated_at,
  };
}

function controlNotFound(): AppError {
  return new AppError("NOT_FOUND", "El control no existe.", 404);
}

function riskNotFound(): AppError {
  return new AppError("NOT_FOUND", "El riesgo no existe.", 404);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseHistoryState(value: unknown) {
  if (!isRecord(value)) return null;

  const effectiveness = Number(value.efectividad);
  const status = value.estado;
  const isKey = value.es_clave;

  if (
    !Number.isFinite(effectiveness) ||
    !controlStatuses.includes(status as (typeof controlStatuses)[number]) ||
    typeof isKey !== "boolean"
  ) {
    return null;
  }

  return {
    effectiveness,
    status: status as (typeof controlStatuses)[number],
    isKey,
  };
}

export class ControlService {
  constructor(
    private readonly repository = new ControlRepository(),
    private readonly authorization = new AuthorizationService(),
  ) {}

  async getOverview(
    riskId: string,
    principal: AuthPrincipal,
  ): Promise<RiskControlOverview> {
    const risk = await this.getRiskContext(riskId);
    this.assertRiskPermission(principal, risk, "read");
    const controls = await this.repository.listByRisk(riskId);
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const [unitAppetites, globalAppetite] = await Promise.all([
      this.repository.findEffectiveAppetites(
        risk.categoria_id,
        risk.unidad_id,
        today,
      ),
      this.repository.findEffectiveGlobalAppetite(
        risk.categoria_id,
        today,
      ),
    ]);
    const appetiteThreshold =
      unitAppetites[0]?.umbral.toNumber() ??
      globalAppetite?.umbral.toNumber() ??
      risk.categorias_riesgo.apetito_base.toNumber();
    const residualLevel = risk.nivel_residual.toNumber();

    return {
      controls: controls.map(mapControl),
      residualLevel,
      appetiteThreshold,
      exceedsAppetite: residualLevel > appetiteThreshold,
    };
  }

  async create(
    riskId: string,
    input: CreateControlInput,
    principal: AuthPrincipal,
  ): Promise<RiskControlOverview> {
    const risk = await this.getRiskContext(riskId);
    this.assertRiskPermission(principal, risk, "create");

    await withAuditContext(principal.userId, async (transaction) => {
      const repository = new ControlRepository(transaction);
      await repository.create({
        riesgo_id: riskId,
        descripcion: input.description,
        tipo: input.type,
        efectividad: input.effectiveness,
        es_clave: input.isKey,
        estado: "activo",
      });
    });

    scheduleAlertEvaluation();
    return this.getOverview(riskId, principal);
  }

  async update(
    controlId: string,
    input: UpdateControlInput,
    principal: AuthPrincipal,
  ): Promise<RiskControlOverview> {
    const control = await this.repository.findById(controlId);

    if (!control || control.riesgos.deleted_at !== null) {
      throw controlNotFound();
    }

    this.authorization.assertAllowed(
      principal,
      "mitigacion",
      "update",
      {
        unitId: control.riesgos.unidad_id,
        ownerId: control.riesgos.creado_por,
        assigneeIds: control.riesgos.propietario_id
          ? [control.riesgos.propietario_id]
          : [],
      },
    );

    await withAuditContext(principal.userId, async (transaction) => {
      const repository = new ControlRepository(transaction);
      await repository.update(controlId, {
        descripcion: input.description,
        tipo: input.type,
        efectividad: input.effectiveness,
        es_clave: input.isKey,
        estado: input.status,
      });
    });

    scheduleAlertEvaluation();
    return this.getOverview(control.riesgo_id, principal);
  }

  async deactivate(
    controlId: string,
    principal: AuthPrincipal,
  ): Promise<RiskControlOverview> {
    const control = await this.repository.findById(controlId);

    if (!control || control.riesgos.deleted_at !== null) {
      throw controlNotFound();
    }

    this.authorization.assertAllowed(
      principal,
      "mitigacion",
      "deactivate",
      {
        unitId: control.riesgos.unidad_id,
        ownerId: control.riesgos.creado_por,
        assigneeIds: control.riesgos.propietario_id
          ? [control.riesgos.propietario_id]
          : [],
      },
    );

    await withAuditContext(principal.userId, async (transaction) => {
      const repository = new ControlRepository(transaction);
      await repository.update(controlId, { deleted_at: new Date() });
    });

    scheduleAlertEvaluation();
    return this.getOverview(control.riesgo_id, principal);
  }

  async getHistory(
    controlId: string,
    principal: AuthPrincipal,
  ): Promise<ControlHistoryEntry[]> {
    const control = await this.repository.findById(controlId);

    if (!control || control.riesgos.deleted_at !== null) {
      throw controlNotFound();
    }

    this.authorization.assertAllowed(
      principal,
      "mitigacion",
      "read",
      {
        unitId: control.riesgos.unidad_id,
        ownerId: control.riesgos.creado_por,
        assigneeIds: control.riesgos.propietario_id
          ? [control.riesgos.propietario_id]
          : [],
      },
    );
    const history = await this.repository.listHistory(controlId);

    return history.flatMap((entry) => {
      if (!isRecord(entry.detalles)) return [];

      const previous = parseHistoryState(entry.detalles.anterior);
      const current = parseHistoryState(entry.detalles.nuevo);

      if (
        !previous ||
        !current ||
        (previous.effectiveness === current.effectiveness &&
          previous.status === current.status &&
          previous.isKey === current.isKey)
      ) {
        return [];
      }

      return [{
        id: entry.id.toString(),
        actor: entry.usuarios
          ? { id: entry.usuarios.id, name: entry.usuarios.nombre }
          : null,
        date: entry.fecha,
        previous,
        current,
      }];
    });
  }

  private async getRiskContext(riskId: string): Promise<RiskContext> {
    const risk = await this.repository.findRiskContext(riskId);

    if (!risk) throw riskNotFound();

    return risk;
  }

  private assertRiskPermission(
    principal: AuthPrincipal,
    risk: RiskContext,
    action: "create" | "read",
  ) {
    this.authorization.assertAllowed(
      principal,
      "mitigacion",
      action,
      {
        unitId: risk.unidad_id,
        ownerId: risk.creado_por,
        assigneeIds: risk.propietario_id ? [risk.propietario_id] : [],
      },
    );
  }
}
