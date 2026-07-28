import { AuthorizationService } from "@/modules/auth/services/authorization.service";
import type { AuthPrincipal } from "@/modules/auth/types/auth.types";
import {
  AuditLogRepository,
  type AuditLogRecord,
} from "@/modules/audit-log/repositories/audit-log.repository";
import type {
  AuditLogEntry,
  PaginatedAuditLog,
} from "@/modules/audit-log/types/audit-log.types";
import type { ListAuditLogQuery } from "@/modules/audit-log/validators/audit-log.validator";

function mapAuditLog(record: AuditLogRecord): AuditLogEntry {
  return {
    id: record.id.toString(), // BIGINT to string
    user: record.usuarios ? { id: record.usuarios.id, name: record.usuarios.nombre } : null,
    action: record.accion,
    entity: record.entidad,
    entityId: record.entidad_id,
    result: record.resultado,
    details: record.detalles,
    ip: record.ip,
    timestamp: record.fecha,
  };
}

export class AuditLogService {
  constructor(
    private readonly repository = new AuditLogRepository(),
    private readonly authorization = new AuthorizationService(),
  ) {}

  async list(
    query: ListAuditLogQuery,
    principal: AuthPrincipal,
  ): Promise<PaginatedAuditLog> {
    // Solo usuarios con permiso de configuración pueden ver la bitácora
    this.authorization.assertAllowed(principal, "bitacora", "read");

    const permissions = principal.permissions.filter(
      (permission) =>
        permission.module === "bitacora" && permission.canRead,
    );
    const hasGlobalScope = permissions.some(
      ({ scope }) => scope === "global",
    );
    const hasUnitScope = permissions.some(
      ({ scope }) => scope === "unidad",
    );
    const hasAssignedScope = permissions.some(
      ({ scope }) => scope === "asignado",
    );
    const hasOwnScope = permissions.some(
      ({ scope }) => scope === "propio",
    );
    const result = await this.repository.list(
      query,
      hasGlobalScope
        ? undefined
        : {
            unitIds: hasUnitScope ? principal.unitIds : undefined,
            assignedUserId: hasAssignedScope
              ? principal.userId
              : undefined,
            ownUserId: hasOwnScope ? principal.userId : undefined,
          },
    );

    return {
      items: result.items.map(mapAuditLog),
      page: query.page,
      pageSize: query.pageSize,
      total: result.total,
      totalPages: Math.ceil(result.total / query.pageSize),
    };
  }
}
