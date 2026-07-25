import { AppError } from "@/lib/app-error";
import { withAuditContext } from "@/lib/transaction";
import { AuthorizationService } from "@/modules/auth/services/authorization.service";
import { scheduleAlertEvaluation } from "@/modules/alerts/services/alert-trigger.service";
import type { AuthPrincipal } from "@/modules/auth/types/auth.types";
import { MitigationRepository } from "@/modules/mitigation/repositories/mitigation.repository";
import type {
  MitigationActionSummary,
  MitigationPlanSummary,
} from "@/modules/mitigation/types/mitigation.types";
import type {
  CreateMitigationActionInput,
  CreateMitigationPlanInput,
  UpdateMitigationActionInput,
  UpdateMitigationPlanInput,
} from "@/modules/mitigation/validators/mitigation.validator";

type PlanRecord = Awaited<
  ReturnType<MitigationRepository["createPlan"]>
>;
type ActionRecord = Awaited<
  ReturnType<MitigationRepository["createAction"]>
>;

function mapAction(action: ActionRecord): MitigationActionSummary {
  return {
    id: action.id,
    description: action.descripcion,
    responsible: {
      id: action.usuarios.id,
      name: action.usuarios.nombre,
    },
    dueDate: action.fecha_limite,
    progress: action.avance.toNumber(),
    status: action.estado,
  };
}

function mapPlan(plan: PlanRecord): MitigationPlanSummary {
  return {
    id: plan.id,
    description: plan.descripcion,
    responsible: {
      id: plan.usuarios.id,
      name: plan.usuarios.nombre,
    },
    dueDate: plan.fecha_limite,
    progress: plan.avance.toNumber(),
    status: plan.estado,
    actions: plan.acciones_mitigacion.map(mapAction),
  };
}

function notFound(entity: "riesgo" | "plan" | "acción"): AppError {
  return new AppError(
    "NOT_FOUND",
    `El ${entity} no existe.`,
    404,
  );
}

export class MitigationService {
  constructor(
    private readonly repository = new MitigationRepository(),
    private readonly authorization = new AuthorizationService(),
  ) {}

  async listByRisk(
    riskId: string,
    principal: AuthPrincipal,
  ): Promise<MitigationPlanSummary[]> {
    const risk = await this.repository.findRiskContext(riskId);

    if (!risk) throw notFound("riesgo");

    this.assertAllowed(principal, "read", risk, []);

    return this.listAfterAuthorizedMutation(riskId);
  }

  async createPlan(
    riskId: string,
    input: CreateMitigationPlanInput,
    principal: AuthPrincipal,
  ): Promise<MitigationPlanSummary[]> {
    const risk = await this.repository.findRiskContext(riskId);

    if (!risk) throw notFound("riesgo");

    this.assertAllowed(principal, "create", risk, []);
    await this.assertActiveResponsible(input.responsibleId);
    this.assertDueDate(input.dueDate, new Date());

    await withAuditContext(principal.userId, async (transaction) => {
      const repository = new MitigationRepository(transaction);
      await repository.createPlan({
        riesgo_id: riskId,
        responsable_id: input.responsibleId,
        descripcion: input.description,
        fecha_limite: input.dueDate,
        avance: input.progress,
        estado: "activo",
      });
    });

    scheduleAlertEvaluation();
    return this.listAfterAuthorizedMutation(riskId);
  }

  async updatePlan(
    planId: string,
    input: UpdateMitigationPlanInput,
    principal: AuthPrincipal,
  ): Promise<MitigationPlanSummary[]> {
    const plan = await this.repository.findPlanById(planId);

    if (!plan || plan.riesgos.deleted_at !== null) {
      throw notFound("plan");
    }

    this.assertAllowed(
      principal,
      "update",
      plan.riesgos,
      [plan.responsable_id],
    );

    if (input.responsibleId) {
      await this.assertActiveResponsible(input.responsibleId);
    }
    if (input.dueDate) {
      this.assertDueDate(input.dueDate, plan.created_at);
    }

    await withAuditContext(principal.userId, async (transaction) => {
      const repository = new MitigationRepository(transaction);
      await repository.updatePlan(planId, {
        responsable_id: input.responsibleId,
        descripcion: input.description,
        fecha_limite: input.dueDate,
        avance: input.progress,
        estado: input.status,
      });
    });

    scheduleAlertEvaluation();
    return this.listAfterAuthorizedMutation(plan.riesgo_id);
  }

  async deactivatePlan(
    planId: string,
    principal: AuthPrincipal,
  ): Promise<MitigationPlanSummary[]> {
    const plan = await this.repository.findPlanById(planId);

    if (!plan || plan.riesgos.deleted_at !== null) {
      throw notFound("plan");
    }

    this.assertAllowed(
      principal,
      "deactivate",
      plan.riesgos,
      [plan.responsable_id],
    );

    await withAuditContext(principal.userId, async (transaction) => {
      const repository = new MitigationRepository(transaction);
      await repository.updatePlan(planId, { deleted_at: new Date() });
    });

    scheduleAlertEvaluation();
    return this.listAfterAuthorizedMutation(plan.riesgo_id);
  }

  async createAction(
    planId: string,
    input: CreateMitigationActionInput,
    principal: AuthPrincipal,
  ): Promise<MitigationPlanSummary[]> {
    const plan = await this.repository.findPlanById(planId);

    if (!plan || plan.riesgos.deleted_at !== null) {
      throw notFound("plan");
    }

    this.assertAllowed(
      principal,
      "create",
      plan.riesgos,
      [plan.responsable_id],
    );
    await this.assertActiveResponsible(input.responsibleId);
    this.assertDueDate(input.dueDate, new Date());

    await withAuditContext(principal.userId, async (transaction) => {
      const repository = new MitigationRepository(transaction);
      await repository.createAction({
        plan_id: planId,
        responsable_id: input.responsibleId,
        descripcion: input.description,
        fecha_limite: input.dueDate,
        avance: input.progress,
        estado: "activo",
      });
    });

    scheduleAlertEvaluation();
    return this.listAfterAuthorizedMutation(plan.riesgo_id);
  }

  async updateAction(
    actionId: string,
    input: UpdateMitigationActionInput,
    principal: AuthPrincipal,
  ): Promise<MitigationPlanSummary[]> {
    const action = await this.repository.findActionById(actionId);
    const plan = action?.planes_mitigacion;

    if (
      !action ||
      !plan ||
      plan.deleted_at !== null ||
      plan.riesgos.deleted_at !== null
    ) {
      throw notFound("acción");
    }

    this.assertAllowed(
      principal,
      "update",
      plan.riesgos,
      [plan.responsable_id, action.responsable_id],
    );

    if (input.responsibleId) {
      await this.assertActiveResponsible(input.responsibleId);
    }
    if (input.dueDate) {
      this.assertDueDate(input.dueDate, action.created_at);
    }

    await withAuditContext(principal.userId, async (transaction) => {
      const repository = new MitigationRepository(transaction);
      await repository.updateAction(actionId, {
        responsable_id: input.responsibleId,
        descripcion: input.description,
        fecha_limite: input.dueDate,
        avance: input.progress,
        estado: input.status,
      });
    });

    const refreshedPlan = await this.repository.findPlanById(plan.id);

    if (!refreshedPlan) throw notFound("plan");

    scheduleAlertEvaluation();
    return this.listAfterAuthorizedMutation(refreshedPlan.riesgo_id);
  }

  async deactivateAction(
    actionId: string,
    principal: AuthPrincipal,
  ): Promise<MitigationPlanSummary[]> {
    const action = await this.repository.findActionById(actionId);
    const plan = action?.planes_mitigacion;

    if (
      !action ||
      !plan ||
      plan.deleted_at !== null ||
      plan.riesgos.deleted_at !== null
    ) {
      throw notFound("acción");
    }

    this.assertAllowed(
      principal,
      "deactivate",
      plan.riesgos,
      [plan.responsable_id, action.responsable_id],
    );

    await withAuditContext(principal.userId, async (transaction) => {
      const repository = new MitigationRepository(transaction);
      await repository.updateAction(actionId, { deleted_at: new Date() });
    });

    const refreshedPlan = await this.repository.findPlanById(plan.id);

    if (!refreshedPlan) throw notFound("plan");

    scheduleAlertEvaluation();
    return this.listAfterAuthorizedMutation(refreshedPlan.riesgo_id);
  }

  private assertAllowed(
    principal: AuthPrincipal,
    action: "create" | "read" | "update" | "deactivate",
    risk: {
      unidad_id: string;
      propietario_id: string | null;
      creado_por: string;
    },
    additionalAssignees: string[],
  ) {
    this.authorization.assertAllowed(
      principal,
      "mitigacion",
      action,
      {
        unitId: risk.unidad_id,
        ownerId: risk.creado_por,
        assigneeIds: [
          ...(risk.propietario_id ? [risk.propietario_id] : []),
          ...additionalAssignees,
        ],
      },
    );
  }

  private async assertActiveResponsible(userId: string) {
    const user = await this.repository.findActiveUser(userId);

    if (!user) {
      throw new AppError(
        "VALIDATION_ERROR",
        "El responsable no existe o está inactivo.",
        400,
      );
    }
  }

  private async listAfterAuthorizedMutation(
    riskId: string,
  ): Promise<MitigationPlanSummary[]> {
    const plans = await this.repository.listByRisk(riskId);

    return plans.map(mapPlan);
  }

  private assertDueDate(dueDate: Date, createdAt: Date) {
    const minimum = new Date(createdAt);
    minimum.setUTCHours(0, 0, 0, 0);

    if (dueDate < minimum) {
      throw new AppError(
        "VALIDATION_ERROR",
        "La fecha límite no puede ser anterior a la fecha de creación.",
        400,
      );
    }
  }
}
