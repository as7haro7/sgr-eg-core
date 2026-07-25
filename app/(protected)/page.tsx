import { ArrowRight, Layers3, MapPin, ShieldCheck } from "lucide-react";
import Link from "next/link";

import { StatusBadge } from "@/components/ui/status-badge";
import { getVisibleNavigation } from "@/config/navigation";
import { getApplicationPrincipal } from "@/modules/auth/services/current-principal.service";

export default async function Home() {
  const principal = await getApplicationPrincipal();
  const availableAreas = getVisibleNavigation(principal).filter(
    ({ href }) => href !== "/",
  );
  const readableModules = new Set(
    principal.permissions
      .filter(({ canRead }) => canRead)
      .map(({ module }) => module),
  );

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl bg-blue-800 text-white shadow-sm">
        <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <StatusBadge className="bg-white/15 text-white ring-white/25">
              Sesión protegida
            </StatusBadge>
            <h1 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">
              Bienvenido, {principal.name}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100 sm:text-base">
              Accede a las funciones habilitadas para tu perfil y alcance
              organizacional.
            </p>
          </div>
          <div className="hidden size-24 items-center justify-center rounded-3xl bg-white/10 lg:flex">
            <ShieldCheck aria-hidden="true" className="size-12" />
          </div>
        </div>
      </section>

      <section aria-labelledby="access-summary-title">
        <div className="mb-4">
          <p className="text-sm font-semibold text-blue-700">Resumen de acceso</p>
          <h2
            id="access-summary-title"
            className="mt-1 text-xl font-bold text-slate-950"
          >
            Tu espacio de trabajo
          </h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <article className="surface-card flex items-center gap-4 p-5">
            <div className="flex size-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <Layers3 aria-hidden="true" className="size-5" />
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums text-slate-950">
                {readableModules.size}
              </p>
              <p className="text-sm text-slate-600">Módulos autorizados</p>
            </div>
          </article>
          <article className="surface-card flex items-center gap-4 p-5">
            <div className="flex size-11 items-center justify-center rounded-xl bg-green-50 text-green-700">
              <MapPin aria-hidden="true" className="size-5" />
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums text-slate-950">
                {principal.unitIds.length}
              </p>
              <p className="text-sm text-slate-600">
                Unidades organizacionales
              </p>
            </div>
          </article>
        </div>
      </section>

      <section aria-labelledby="available-areas-title">
        <div className="mb-4">
          <p className="text-sm font-semibold text-blue-700">
            Accesos habilitados
          </p>
          <h2
            id="available-areas-title"
            className="mt-1 text-xl font-bold text-slate-950"
          >
            Áreas disponibles
          </h2>
        </div>

        {availableAreas.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {availableAreas.map(({ href, icon: Icon, label }) => (
              <Link
                key={href}
                href={href}
                className="surface-card group flex min-h-32 items-center gap-4 p-5 transition hover:border-blue-300 hover:shadow-md"
              >
                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700 transition group-hover:bg-blue-700 group-hover:text-white">
                  <Icon aria-hidden="true" className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-slate-950">{label}</h3>
                  <p className="mt-1 text-sm text-slate-600">
                    Abrir área de trabajo
                  </p>
                </div>
                <ArrowRight
                  aria-hidden="true"
                  className="size-5 shrink-0 text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-blue-700"
                />
              </Link>
            ))}
          </div>
        ) : (
          <div className="surface-card p-6 text-sm text-slate-600">
            Tu perfil no tiene áreas funcionales de lectura asignadas. Contacta
            a un administrador si necesitas acceso.
          </div>
        )}
      </section>
    </div>
  );
}
