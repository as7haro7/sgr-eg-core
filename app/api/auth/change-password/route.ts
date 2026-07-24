import type { NextRequest } from "next/server";

import { AppError } from "@/lib/app-error";
import { errorResponse, successResponse } from "@/lib/http-response";
import {
  SESSION_COOKIE_BASE_OPTIONS,
  SESSION_COOKIE_NAME,
} from "@/modules/auth/constants/session-cookie";
import { AuthService } from "@/modules/auth/services/auth.service";
import { getAuthRequestContext } from "@/modules/auth/utils/request-context";
import { changePasswordSchema } from "@/modules/auth/validators/change-password.validator";

const authService = new AuthService();

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;

    if (!token) {
      throw new AppError(
        "AUTHENTICATION_REQUIRED",
        "Se requiere una sesión válida.",
        401,
      );
    }

    const input = changePasswordSchema.parse(await request.json());
    await authService.changePassword(
      token,
      input,
      getAuthRequestContext(request),
    );

    const response = successResponse(
      null,
      "Contraseña actualizada correctamente. Inicia sesión nuevamente.",
    );
    response.cookies.set(SESSION_COOKIE_NAME, "", {
      ...SESSION_COOKIE_BASE_OPTIONS,
      expires: new Date(0),
    });

    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
