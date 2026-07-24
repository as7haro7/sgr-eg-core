import { ShieldCheck } from "lucide-react";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { SESSION_COOKIE_NAME } from "@/modules/auth/constants/session-cookie";
import { LogoutButton } from "@/modules/auth/components/logout-button";
import { AuthService } from "@/modules/auth/services/auth.service";
import { AuthorizationService } from "@/modules/auth/services/authorization.service";
import type { AuthPrincipal } from "@/modules/auth/types/auth.types";

const authService = new AuthService();
const authorizationService = new AuthorizationService();

export default async function Home() {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    redirect("/login");
  }

  let principal: AuthPrincipal;

  try {
    principal = await authService.authenticate(token);
  } catch {
    redirect("/login");
  }

  if (principal.mustChangePassword) {
    redirect("/change-password");
  }

  const canReadUsers = authorizationService.isAllowed(
    principal,
    "usuarios",
    "read",
  );
  const canReadOrganization = authorizationService.isAllowed(
    principal,
    "organizacion",
    "read",
  );
  const canReadRisks = principal.permissions.some(
    (permission) =>
      permission.module === "riesgos" && permission.canRead,
  );

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10 dark:bg-slate-950">
      <section className="mx-auto max-w-5xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white dark:bg-white dark:text-slate-950">
              <ShieldCheck aria-hidden="true" className="size-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                SGR-EG
              </p>
              <h1 className="mt-1 text-2xl font-bold text-slate-950 dark:text-white">
                Bienvenido, {principal.name}
              </h1>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                La autenticación y autorización base están activas.
              </p>
            </div>
          </div>

          <LogoutButton />
        </div>

        <div className="mt-8 flex flex-wrap gap-3 border-t border-slate-200 pt-6 dark:border-slate-800">
          {canReadRisks && (
            <Link
              href="/risks"
              className="inline-flex h-11 items-center justify-center rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white transition-colors hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-950 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
            >
              Gestionar riesgos
            </Link>
          )}
            {canReadUsers && (
            <Link
              href="/users"
              className="inline-flex h-11 items-center justify-center rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white transition-colors hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-950 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
            >
              Administrar usuarios
            </Link>
            )}
            {canReadOrganization && (
              <>
                <Link
                  href="/organization"
                  className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-950 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:hover:bg-slate-900 dark:focus-visible:outline-white"
                >
                  Administrar organización
                </Link>
                <Link
                  href="/settings"
                  className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-950 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:hover:bg-slate-900 dark:focus-visible:outline-white"
                >
                  Configuración
                </Link>
              </>
            )}
          <Link
            href="/change-password"
            className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-950 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:hover:bg-slate-900 dark:focus-visible:outline-white"
          >
            Cambiar contraseña
          </Link>
        </div>
      </section>
    </main>
  );
}
