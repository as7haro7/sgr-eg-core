import type { NextRequest } from "next/server";

import { errorResponse, successResponse } from "@/lib/http-response";
import { requirePermission } from "@/modules/auth/services/auth-guard.service";
import { UserService } from "@/modules/users/services/user.service";
import {
  createUserSchema,
  listUsersQuerySchema,
} from "@/modules/users/validators/user.validator";

const userService = new UserService();

export async function GET(request: NextRequest) {
  try {
    await requirePermission(request, "usuarios", "read");
    const query = listUsersQuerySchema.parse(
      Object.fromEntries(request.nextUrl.searchParams),
    );
    const users = await userService.list(query);

    return successResponse(users, "Usuarios obtenidos correctamente.");
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const principal = await requirePermission(
      request,
      "usuarios",
      "create",
    );
    const input = createUserSchema.parse(await request.json());
    const user = await userService.create(input, principal.userId);

    return successResponse(user, "Usuario creado correctamente.", 201);
  } catch (error) {
    return errorResponse(error);
  }
}
