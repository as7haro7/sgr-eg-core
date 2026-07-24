import { AppError } from "@/lib/app-error";
import type {
  AuthPermission,
  AuthPrincipal,
} from "@/modules/auth/types/auth.types";
import type {
  AuthorizationContext,
  PermissionAction,
} from "@/modules/auth/types/authorization.types";

function allowsAction(
  permission: AuthPermission,
  action: PermissionAction,
): boolean {
  const actionMap: Record<PermissionAction, boolean> = {
    create: permission.canCreate,
    read: permission.canRead,
    update: permission.canUpdate,
    deactivate: permission.canDeactivate,
  };

  return actionMap[action];
}

function allowsScope(
  principal: AuthPrincipal,
  permission: AuthPermission,
  context: AuthorizationContext,
): boolean {
  switch (permission.scope) {
    case "global":
      return true;
    case "unidad":
      return (
        context.unitId !== undefined &&
        principal.unitIds.includes(context.unitId)
      );
    case "propio":
      return (
        context.ownerId !== undefined &&
        context.ownerId === principal.userId
      );
    case "asignado":
      return context.assigneeIds?.includes(principal.userId) ?? false;
  }
}

export class AuthorizationService {
  isAllowed(
    principal: AuthPrincipal,
    module: string,
    action: PermissionAction,
    context: AuthorizationContext = {},
  ): boolean {
    return principal.permissions.some(
      (permission) =>
        permission.module === module &&
        allowsAction(permission, action) &&
        allowsScope(principal, permission, context),
    );
  }

  assertAllowed(
    principal: AuthPrincipal,
    module: string,
    action: PermissionAction,
    context: AuthorizationContext = {},
  ): void {
    const allowed = this.isAllowed(principal, module, action, context);

    if (!allowed) {
      throw new AppError(
        "FORBIDDEN",
        "No tienes permiso para realizar esta acción.",
        403,
      );
    }
  }
}
