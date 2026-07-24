import { KeyRound } from "lucide-react";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ChangePasswordForm } from "@/modules/auth/components/change-password-form";
import { SESSION_COOKIE_NAME } from "@/modules/auth/constants/session-cookie";
import { AuthService } from "@/modules/auth/services/auth.service";

export const metadata: Metadata = {
  title: "Cambiar contraseña | SGR-EG",
};

export const dynamic = "force-dynamic";

const authService = new AuthService();

export default async function ChangePasswordPage() {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    redirect("/login");
  }

  try {
    await authService.authenticate(token);
  } catch {
    redirect("/login");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-12 dark:bg-slate-950">
      <section
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-900/5 sm:p-8 dark:border-slate-800 dark:bg-slate-900"
        aria-labelledby="change-password-title"
      >
        <div className="mb-8">
          <div className="mb-5 flex size-12 items-center justify-center rounded-xl bg-slate-950 text-white dark:bg-white dark:text-slate-950">
            <KeyRound aria-hidden="true" className="size-7" />
          </div>
          <p className="mb-2 text-sm font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
            SGR-EG
          </p>
          <h1
            id="change-password-title"
            className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white"
          >
            Cambiar contraseña
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
            Al completar el cambio se cerrarán todas tus sesiones por
            seguridad.
          </p>
        </div>

        <ChangePasswordForm />
      </section>
    </main>
  );
}
