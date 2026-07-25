import type { NextRequest } from "next/server";

import { errorResponse, successResponse } from "@/lib/http-response";
import { requirePermission } from "@/modules/auth/services/auth-guard.service";
import { RoleService } from "@/modules/roles/services/role.service";
import { roleIdSchema } from "@/modules/roles/validators/role.validator";

const roleService = new RoleService();

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ roleId: string }> },
) {
  try {
    const principal = await requirePermission(
      request,
      "usuarios",
      "deactivate",
    );
    await roleService.deactivate(
      roleIdSchema.parse((await context.params).roleId),
      principal.userId,
    );
    return successResponse(null, "Rol desactivado correctamente.");
  } catch (error) {
    return errorResponse(error);
  }
}
