import { ShieldCheck } from "lucide-react";

import { StatusBadge } from "@/components/ui/status-badge";
import { getApplicationPrincipal } from "@/modules/auth/services/current-principal.service";
import { DashboardService } from "@/modules/dashboard/services/dashboard.service";
import { DashboardKPIs } from "@/modules/dashboard/components/dashboard-kpis";
import { DashboardCharts } from "@/modules/dashboard/components/dashboard-charts";
import { BusinessUnitService } from "@/modules/business-units/services/business-unit.service";

export const dynamic = "force-dynamic";

const dashboardService = new DashboardService();
const businessUnitService = new BusinessUnitService();

interface HomePageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function Home({ searchParams }: HomePageProps) {
  const principal = await getApplicationPrincipal();
  const raw = await searchParams;
  
  const unitId = first(raw.unitId);
  const units = await businessUnitService.list();

  // If unitId is provided but the user doesn't have access to it, DashboardService will filter it or return empty
  const summary = await dashboardService.getSummary(
    { unitId, periodStart: undefined, periodEnd: undefined }, 
    principal
  );

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl bg-blue-800 text-white shadow-sm">
        <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <StatusBadge className="bg-white/15 text-white ring-white/25">
              Dashboard Principal
            </StatusBadge>
            <h1 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">
              Bienvenido, {principal.name}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100 sm:text-base">
              Visión general del perfil de riesgo, cumplimiento normativo y estado de auditorías.
            </p>
          </div>
          <div className="hidden size-24 items-center justify-center rounded-3xl bg-white/10 lg:flex">
            <ShieldCheck aria-hidden="true" className="size-12" />
          </div>
        </div>
      </section>

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-950">Indicadores Clave</h2>
        <form method="get" className="flex items-center gap-3">
          <select
            name="unitId"
            defaultValue={unitId ?? ""}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Todas mis unidades</option>
            {units.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.name}
              </option>
            ))}
          </select>
          <button type="submit" className="rounded-lg bg-blue-700 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-800">
            Filtrar
          </button>
        </form>
      </div>

      <DashboardKPIs summary={summary} />

      <DashboardCharts summary={summary} />
      
    </div>
  );
}
