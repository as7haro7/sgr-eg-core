import type { NextRequest } from "next/server";

import { errorResponse, successResponse } from "@/lib/http-response";
import { SESSION_COOKIE_BASE_OPTIONS, SESSION_COOKIE_NAME } from "@/modules/auth/constants/session-cookie";
import { AuthService } from "@/modules/auth/services/auth.service";
import { getAuthRequestContext } from "@/modules/auth/utils/request-context";
import { loginSchema } from "@/modules/auth/validators/login.validator";

const authService = new AuthService();

export async function POST(request: NextRequest) {
  try {
    const input = loginSchema.parse(await request.json());
    const session = await authService.login(
      input,
      getAuthRequestContext(request),
    );
    const response = successResponse(
      {
        expiresAt: session.expiresAt,
        principal: session.principal,
      },
      "Sesión iniciada correctamente.",
    );

    response.cookies.set(SESSION_COOKIE_NAME, session.token, {
      ...SESSION_COOKIE_BASE_OPTIONS,
      expires: session.expiresAt,
    });

    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
