import type { NextRequest } from "next/server";

import { errorResponse, successResponse } from "@/lib/http-response";
import { requirePermission } from "@/modules/auth/services/auth-guard.service";
import { RoleService } from "@/modules/roles/services/role.service";
import {
  roleIdSchema,
  updateRoleSchema,
} from "@/modules/roles/validators/role.validator";

const roleService = new RoleService();

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ roleId: string }> },
) {
  try {
    const principal = await requirePermission(request, "usuarios", "update");
    const role = await roleService.update(
      roleIdSchema.parse((await context.params).roleId),
      updateRoleSchema.parse(await request.json()),
      principal.userId,
    );
    return successResponse(role, "Rol actualizado correctamente.");
  } catch (error) {
    return errorResponse(error);
  }
}
