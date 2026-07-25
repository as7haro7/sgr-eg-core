import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { SESSION_COOKIE_NAME } from "@/modules/auth/constants/session-cookie";
import { AuthService } from "@/modules/auth/services/auth.service";
import type { AuthPrincipal } from "@/modules/auth/types/auth.types";

const authService = new AuthService();

export const getCurrentPrincipal = cache(
  async (): Promise<AuthPrincipal> => {
    const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;

    if (!token) {
      redirect("/login");
    }

    try {
      return await authService.authenticate(token);
    } catch {
      redirect("/login");
    }
  },
);

export async function getApplicationPrincipal(): Promise<AuthPrincipal> {
  const principal = await getCurrentPrincipal();

  if (principal.mustChangePassword) {
    redirect("/change-password");
  }

  return principal;
}
