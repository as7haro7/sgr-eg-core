import { ShieldCheck } from "lucide-react";
import type { Metadata } from "next";

import { LoginForm } from "@/modules/auth/components/login-form";

export const metadata: Metadata = {
  title: "Iniciar sesión | SGR-EG",
};

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-12 dark:bg-slate-950">
      <section
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-900/5 sm:p-8 dark:border-slate-800 dark:bg-slate-900"
        aria-labelledby="login-title"
      >
        <div className="mb-8">
          <div className="mb-5 flex size-12 items-center justify-center rounded-xl bg-slate-950 text-white dark:bg-white dark:text-slate-950">
            <ShieldCheck aria-hidden="true" className="size-7" />
          </div>
          <p className="mb-2 text-sm font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
            SGR-EG
          </p>
          <h1
            id="login-title"
            className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white"
          >
            Iniciar sesión
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
            Accede al Sistema de Gestión de Riesgos Empresariales Globales.
          </p>
        </div>

        <LoginForm />
      </section>
    </main>
  );
}
