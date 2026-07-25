import type { Prisma } from "@/generated/prisma/client";
import { AppError } from "@/lib/app-error";
import { withAuditContext } from "@/lib/transaction";
import { AuthorizationService } from "@/modules/auth/services/authorization.service";
import type {
  AuthPermission,
  AuthPrincipal,
} from "@/modules/auth/types/auth.types";
import {
  AuditRepository,
  type AuditSummaryRecord,
} from "@/modules/audits/repositories/audit.repository";
import type {
  AuditSummary,
  AuditUserOption,
  PaginatedAudits,
} from "@/modules/audits/types/audit.types";
import type {
  CreateAuditInput,
  ListAuditsQuery,
} from "@/modules/audits/validators/audit.validator";

function mapAudit(record: AuditSummaryRecord): AuditSummary {
  return {
    id: record.id,
    objective: record.objetivo,
    scope: record.alcance,
    startDate: record.fecha_inicio,
    endDate: record.fecha_fin,
    status: record.estado,
    responsible: {
      id: record.usuarios.id,
      name: record.usuarios.nombre,
    },
    unit: record.unidades_negocio
      ? {
          id: record.unidades_negocio.id,
          name: record.unidades_negocio.nombre,
        }
      : null,
    team: record.auditoria_equipo.map((member) => ({
      id: member.usuarios.id,
      name: member.usuarios.nombre,
      function: member.funcion,
    })),
    findingCount: record._count.hallazgos,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

function hasAction(
  permission: AuthPermission,
  action: "read" | "create",
): boolean {
  return action === "read" ? permission.canRead : permission.canCreate;
}

function buildScopeWhere(
  principal: AuthPrincipal,
  action: "read" | "create",
): Prisma.auditoriasWhereInput {
  const permissions = principal.permissions.filter(
    (permission) =>
      permission.module === "auditorias" &&
      hasAction(permission, action),
  );

  if (permissions.some(({ scope }) => scope === "global")) return {};

  const scopes: Prisma.auditoriasWhereInput[] = [];

  if (
    permissions.some(({ scope }) => scope === "unidad") &&
    principal.unitIds.length > 0
  ) {
    scopes.push({ unidad_id: { in: principal.unitIds } });
  }

  if (
    permissions.some(
      ({ scope }) => scope === "asignado" || scope === "propio",
    )
  ) {
    scopes.push({
      OR: [
        { responsable_id: principal.userId },
        { auditoria_equipo: { some: { usuario_id: principal.userId } } },
      ],
    });
  }

  if (scopes.length === 0) {
    throw new AppError(
      "FORBIDDEN",
      "No tienes permiso para realizar esta acción.",
      403,
    );
  }

  return { OR: scopes };
}

export class AuditService {
  constructor(
    private readonly repository = new AuditRepository(),
    private readonly authorization = new AuthorizationService(),
  ) {}

  async list(
    query: ListAuditsQuery,
    principal: AuthPrincipal,
  ): Promise<PaginatedAudits> {
    const result = await this.repository.list(
      query,
      buildScopeWhere(principal, "read"),
    );

    return {
      items: result.items.map(mapAudit),
      page: query.page,
      pageSize: query.pageSize,
      total: result.total,
      totalPages: Math.ceil(result.total / query.pageSize),
    };
  }

  async getById(
    auditId: string,
    principal: AuthPrincipal,
  ): Promise<AuditSummary> {
    const audit = await this.repository.findById(auditId);

    if (!audit) {
      throw new AppError("NOT_FOUND", "La auditoría no existe.", 404);
    }

    this.authorization.assertAllowed(
      principal,
      "auditorias",
      "read",
      {
        unitId: audit.unidad_id ?? undefined,
        ownerId: audit.responsable_id,
        assigneeIds: [
          audit.responsable_id,
          ...audit.auditoria_equipo.map(({ usuario_id }) => usuario_id),
        ],
      },
    );

    return mapAudit(audit);
  }

  async listUserOptions(): Promise<AuditUserOption[]> {
    const users = await this.repository.listActiveUsers();

    return users.map((user) => ({
      id: user.id,
      name: user.nombre,
      unitIds: user.usuario_unidades.map(({ unidad_id }) => unidad_id),
    }));
  }

  async create(
    input: CreateAuditInput,
    principal: AuthPrincipal,
  ): Promise<AuditSummary> {
    const teamMemberIds = [...new Set(input.teamMemberIds)];
    const assigneeIds = [...new Set([
      input.responsibleId,
      ...teamMemberIds,
    ])];
    this.authorization.assertAllowed(
      principal,
      "auditorias",
      "create",
      {
        unitId: input.unitId ?? undefined,
        ownerId: input.responsibleId,
        assigneeIds,
      },
    );

    const [unit, activeUsers] = await Promise.all([
      input.unitId
        ? this.repository.findActiveUnit(input.unitId)
        : Promise.resolve({ id: "" }),
      this.repository.findActiveUsers(assigneeIds),
    ]);

    if (input.unitId && !unit) {
      throw new AppError(
        "VALIDATION_ERROR",
        "La unidad no existe o está inactiva.",
        400,
      );
    }

    if (activeUsers.length !== assigneeIds.length) {
      throw new AppError(
        "VALIDATION_ERROR",
        "Uno o más integrantes no existen o están inactivos.",
        400,
      );
    }

    const audit = await withAuditContext(
      principal.userId,
      async (transaction) => {
        const repository = new AuditRepository(transaction);

        return repository.create({
          objetivo: input.objective,
          alcance: input.scope,
          fecha_inicio: input.startDate,
          fecha_fin: input.endDate,
          estado: "planificada",
          usuarios: { connect: { id: input.responsibleId } },
          unidades_negocio: input.unitId
            ? { connect: { id: input.unitId } }
            : undefined,
          auditoria_equipo:
            teamMemberIds.length > 0
              ? {
                  create: teamMemberIds.map((userId) => ({
                    usuarios: { connect: { id: userId } },
                  })),
                }
              : undefined,
        });
      },
    );

    return mapAudit(audit);
  }
}
