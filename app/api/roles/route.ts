import type { NextRequest } from "next/server";

import { errorResponse, successResponse } from "@/lib/http-response";
import { requirePermission } from "@/modules/auth/services/auth-guard.service";
import { RoleService } from "@/modules/roles/services/role.service";
import { createRoleSchema } from "@/modules/roles/validators/role.validator";

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

export async function POST(request: NextRequest) {
  try {
    const principal = await requirePermission(request, "usuarios", "create");
    const role = await roleService.create(
      createRoleSchema.parse(await request.json()),
      principal.userId,
    );
    return successResponse(role, "Rol creado correctamente.", 201);
  } catch (error) {
    return errorResponse(error);
  }
}
