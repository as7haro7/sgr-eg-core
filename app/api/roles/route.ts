import type { NextRequest } from "next/server";

import { errorResponse, successResponse } from "@/lib/http-response";
import { requirePermission } from "@/modules/auth/services/auth-guard.service";
import { RoleService } from "@/modules/roles/services/role.service";

const roleService = new RoleService();

export async function GET(request: NextRequest) {
  try {
    await requirePermission(request, "usuarios", "read");
    const roles = await roleService.listActive();

    return successResponse(roles, "Roles obtenidos correctamente.");
  } catch (error) {
    return errorResponse(error);
  }
}
