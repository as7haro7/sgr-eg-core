import {
  BarChart3,
  CheckCircle2,
  Globe2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import type { Metadata } from "next";

import { LoginForm } from "@/modules/auth/components/login-form";

export const metadata: Metadata = {
  title: "Iniciar sesión | SGR-EG",
};

export default function LoginPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#eef3fb] px-4 py-8 sm:px-6 lg:flex lg:items-center lg:py-12 dark:bg-slate-950">
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-[55%] bg-[linear-gradient(135deg,#0f3d91_0%,#1769d2_55%,#38a1ff_100%)] lg:inset-y-0 lg:right-auto lg:h-auto lg:w-[58%]"
      />
      <div
        aria-hidden="true"
        className="absolute left-[8%] top-20 size-64 rounded-full bg-cyan-300/20 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="absolute bottom-10 left-[42%] size-80 rounded-full bg-blue-950/20 blur-3xl"
      />

      <div className="relative mx-auto grid w-full max-w-6xl items-center gap-8 lg:grid-cols-[1.12fr_0.88fr] lg:gap-16">
        <section
          className="px-2 py-4 text-white sm:px-6 lg:py-10"
          aria-label="Presentación del sistema"
        >
          <div className="mb-10 inline-flex items-center gap-3 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 shadow-lg shadow-blue-950/10 backdrop-blur">
            <span className="flex size-11 items-center justify-center rounded-xl bg-white text-blue-700 shadow-sm">
              <ShieldCheck aria-hidden="true" className="size-7" />
            </span>
            <div>
              <p className="font-bold tracking-wide">SGR-EG</p>
              <p className="text-xs text-blue-100">Gestión segura y trazable</p>
            </div>
          </div>

          <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-blue-100">
            <Sparkles aria-hidden="true" className="size-4" />
            Decisiones informadas, riesgos bajo control
          </p>
          <h1
            id="login-title"
            className="max-w-2xl text-4xl leading-[1.08] font-black tracking-tight sm:text-5xl"
          >
            Sistema de Gestión de Riesgos Empresariales Globales
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-blue-50 sm:text-lg">
            Centraliza riesgos, controles, cumplimiento y auditoría en una
            plataforma diseñada para proteger cada decisión de tu organización.
          </p>

          <div className="mt-8 grid max-w-xl gap-3 sm:grid-cols-3">
            <Feature icon={Globe2} label="Visión global" />
            <Feature icon={BarChart3} label="Datos oportunos" />
            <Feature icon={CheckCircle2} label="Control continuo" />
          </div>
        </section>

        <section
          className="rounded-[1.75rem] border border-white/70 bg-white p-6 shadow-2xl shadow-blue-950/20 sm:p-9 dark:border-slate-700 dark:bg-slate-900"
          aria-labelledby="access-title"
        >
          <div className="mb-7">
            <p className="mb-2 text-sm font-bold tracking-[0.16em] text-blue-700 uppercase dark:text-blue-400">
              Acceso seguro
            </p>
            <h2
              id="access-title"
              className="text-3xl font-black tracking-tight text-slate-950 dark:text-white"
            >
              Inicia sesión
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
              Ingresa tus credenciales institucionales para continuar.
            </p>
          </div>

          <LoginForm />

          <div className="mt-7 flex items-center justify-center gap-2 border-t border-slate-200 pt-5 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
            <ShieldCheck
              aria-hidden="true"
              className="size-4 text-emerald-600"
            />
            Sesión protegida y actividad registrada
          </div>
        </section>
      </div>
    </main>
  );
}

function Feature({
  icon: Icon,
  label,
}: {
  icon: typeof Globe2;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-white/15 bg-blue-950/15 px-3 py-2.5 text-sm font-semibold backdrop-blur-sm">
      <Icon aria-hidden="true" className="size-4 text-cyan-200" />
      {label}
    </div>
  );
}
