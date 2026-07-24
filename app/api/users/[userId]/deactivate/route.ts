import type { NextRequest } from "next/server";

import { errorResponse, successResponse } from "@/lib/http-response";
import { requirePermission } from "@/modules/auth/services/auth-guard.service";
import { UserService } from "@/modules/users/services/user.service";
import { userIdSchema } from "@/modules/users/validators/user.validator";

const userService = new UserService();

interface RouteContext {
  params: Promise<{ userId: string }>;
}

export async function POST(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const principal = await requirePermission(
      request,
      "usuarios",
      "deactivate",
    );
    const userId = userIdSchema.parse((await context.params).userId);

    await userService.deactivate(userId, principal.userId);

    return successResponse(null, "Usuario desactivado correctamente.");
  } catch (error) {
    return errorResponse(error);
  }
}
