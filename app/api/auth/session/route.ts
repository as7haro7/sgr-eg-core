import type { NextRequest } from "next/server";

import { AppError } from "@/lib/app-error";
import { errorResponse, successResponse } from "@/lib/http-response";
import { SESSION_COOKIE_NAME } from "@/modules/auth/constants/session-cookie";
import { AuthService } from "@/modules/auth/services/auth.service";

const authService = new AuthService();

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;

    if (!token) {
      throw new AppError(
        "AUTHENTICATION_REQUIRED",
        "Se requiere una sesión válida.",
        401,
      );
    }

    const principal = await authService.authenticate(token);

    return successResponse(
      { principal },
      "Sesión válida.",
    );
  } catch (error) {
    return errorResponse(error);
  }
}
