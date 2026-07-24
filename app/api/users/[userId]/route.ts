import type { NextRequest } from "next/server";

import { errorResponse, successResponse } from "@/lib/http-response";
import { requirePermission } from "@/modules/auth/services/auth-guard.service";
import { UserService } from "@/modules/users/services/user.service";
import {
  updateUserSchema,
  userIdSchema,
} from "@/modules/users/validators/user.validator";

const userService = new UserService();

interface RouteContext {
  params: Promise<{ userId: string }>;
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const principal = await requirePermission(
      request,
      "usuarios",
      "update",
    );
    const userId = userIdSchema.parse((await context.params).userId);
    const input = updateUserSchema.parse(await request.json());
    const user = await userService.update(
      userId,
      input,
      principal.userId,
    );

    return successResponse(user, "Usuario actualizado correctamente.");
  } catch (error) {
    return errorResponse(error);
  }
}
