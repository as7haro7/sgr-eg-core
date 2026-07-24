import type { NextRequest } from "next/server";

import { errorResponse, successResponse } from "@/lib/http-response";
import { SESSION_COOKIE_BASE_OPTIONS, SESSION_COOKIE_NAME } from "@/modules/auth/constants/session-cookie";
import { AuthService } from "@/modules/auth/services/auth.service";
import { getAuthRequestContext } from "@/modules/auth/utils/request-context";

const authService = new AuthService();

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;

    if (token) {
      await authService.logout(token, getAuthRequestContext(request));
    }

    const response = successResponse(
      null,
      "Sesión cerrada correctamente.",
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
