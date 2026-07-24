import type { NextRequest } from "next/server";

import { AppError } from "@/lib/app-error";
import { SESSION_COOKIE_NAME } from "@/modules/auth/constants/session-cookie";
import { AuthService } from "@/modules/auth/services/auth.service";
import { AuthorizationService } from "@/modules/auth/services/authorization.service";
import type { AuthPrincipal } from "@/modules/auth/types/auth.types";
import type {
  AuthorizationContext,
  PermissionAction,
} from "@/modules/auth/types/authorization.types";

const authService = new AuthService();
const authorizationService = new AuthorizationService();

export async function requireAuthentication(
  request: NextRequest,
): Promise<AuthPrincipal> {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    throw new AppError(
      "AUTHENTICATION_REQUIRED",
      "Se requiere una sesión válida.",
      401,
    );
  }

  const principal = await authService.authenticate(token);

  if (principal.mustChangePassword) {
    throw new AppError(
      "PASSWORD_CHANGE_REQUIRED",
      "Debes cambiar tu contraseña antes de continuar.",
      403,
    );
  }

  return principal;
}

export async function requirePermission(
  request: NextRequest,
  module: string,
  action: PermissionAction,
  context: AuthorizationContext = {},
): Promise<AuthPrincipal> {
  const principal = await requireAuthentication(request);

  authorizationService.assertAllowed(
    principal,
    module,
    action,
    context,
  );

  return principal;
}
