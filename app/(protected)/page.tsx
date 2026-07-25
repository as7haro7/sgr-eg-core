import { ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";
import Link from "next/link";

import { StatusBadge } from "@/components/ui/status-badge";
import { BusinessUnitService } from "@/modules/business-units/services/business-unit.service";
import { DashboardCharts } from "@/modules/dashboard/components/dashboard-charts";
import { DashboardKPIs } from "@/modules/dashboard/components/dashboard-kpis";
import { DashboardService } from "@/modules/dashboard/services/dashboard.service";
import { dashboardFilterSchema } from "@/modules/dashboard/validators/dashboard.validator";
import { getApplicationPrincipal } from "@/modules/auth/services/current-principal.service";
import {
  riskStatusLabels,
  riskStatuses,
} from "@/modules/risks/constants/risk-status";
import { RiskConfigurationService } from "@/modules/risks/services/risk-configuration.service";
import { RiskService } from "@/modules/risks/services/risk.service";
import { parsePageQuery } from "@/modules/shared/validators/query.validator";

export const dynamic = "force-dynamic";

const dashboardService = new DashboardService();
const businessUnitService = new BusinessUnitService();
const riskConfigurationService = new RiskConfigurationService();
const riskService = new RiskService();

interface HomePageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function Home({ searchParams }: HomePageProps) {
  const principal = await getApplicationPrincipal();
  const canReadReports = principal.permissions.some(
    (permission) =>
      permission.module === "reportes" && permission.canRead,
  );
  if (!canReadReports) {
    const fallback =
      principal.permissions.find(
        (permission) =>
          permission.canRead &&
          ["riesgos", "auditorias", "cumplimiento"].includes(
            permission.module,
          ),
      )?.module ?? "alerts";
    redirect(
      fallback === "riesgos"
        ? "/risks"
        : fallback === "auditorias"
          ? "/audits"
          : fallback === "cumplimiento"
            ? "/compliance"
            : "/alerts",
    );
  }
  const raw = await searchParams;
  const filter = parsePageQuery(dashboardFilterSchema, {
    unitId: first(raw.unitId),
    countryId: first(raw.countryId),
    categoryId: first(raw.categoryId),
    ownerId: first(raw.ownerId),
    status: first(raw.status),
    periodStart: first(raw.periodStart),
    periodEnd: first(raw.periodEnd),
  });
  const hasGlobalReports = principal.permissions.some(
    (permission) =>
      permission.module === "reportes" &&
      permission.canRead &&
      permission.scope === "global",
  );
  const [summary, allUnits, categories, owners] = await Promise.all([
    dashboardService.getSummary(filter, principal),
    businessUnitService.listActive(),
    riskConfigurationService.listCategories(),
    riskService.listOwnerOptions(
      hasGlobalReports ? undefined : principal.unitIds,
    ),
  ]);
  const units = hasGlobalReports
    ? allUnits
    : allUnits.filter((unit) => principal.unitIds.includes(unit.id));
  const countries = Array.from(
    new Map(units.map((unit) => [unit.country.id, unit.country])).values(),
  );

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl bg-blue-800 text-white shadow-sm">
        <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <StatusBadge className="bg-white/15 text-white ring-white/25">
              Dashboard principal
            </StatusBadge>
            <h1 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">
              Bienvenido, {principal.name}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100 sm:text-base">
              Visión combinable del perfil de riesgo, cumplimiento y auditorías.
            </p>
          </div>
          <div className="hidden size-24 items-center justify-center rounded-3xl bg-white/10 lg:flex">
            <ShieldCheck aria-hidden="true" className="size-12" />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-bold text-slate-950">
          Filtros del dashboard
        </h2>
        <form
          method="get"
          className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
        >
          <select name="countryId" defaultValue={first(raw.countryId) ?? ""}>
            <option value="">Todos los países</option>
            {countries.map((country) => (
              <option key={country.id} value={country.id}>
                {country.name}
              </option>
            ))}
          </select>
          <select name="unitId" defaultValue={first(raw.unitId) ?? ""}>
            <option value="">Todas las unidades permitidas</option>
            {units.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.name}
              </option>
            ))}
          </select>
          <select name="categoryId" defaultValue={first(raw.categoryId) ?? ""}>
            <option value="">Todas las categorías</option>
            {categories
              .filter(({ status }) => status === "activo")
              .map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
          </select>
          <select name="ownerId" defaultValue={first(raw.ownerId) ?? ""}>
            <option value="">Todos los responsables</option>
            {owners.map((owner) => (
              <option key={owner.id} value={owner.id}>
                {owner.name}
              </option>
            ))}
          </select>
          <select name="status" defaultValue={first(raw.status) ?? ""}>
            <option value="">Todos los estados</option>
            {riskStatuses.map((status) => (
              <option key={status} value={status}>
                {riskStatusLabels[status]}
              </option>
            ))}
          </select>
          <label className="grid gap-1 text-sm text-slate-700">
            Desde
            <input
              name="periodStart"
              type="date"
              defaultValue={first(raw.periodStart) ?? ""}
            />
          </label>
          <label className="grid gap-1 text-sm text-slate-700">
            Hasta
            <input
              name="periodEnd"
              type="date"
              defaultValue={first(raw.periodEnd) ?? ""}
            />
          </label>
          <div className="flex items-end gap-2">
            <button
              type="submit"
              className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
            >
              Aplicar filtros
            </button>
            <Link
              href="/"
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Limpiar
            </Link>
          </div>
        </form>
      </section>

      <DashboardKPIs summary={summary} />
      <DashboardCharts summary={summary} />
    </div>
  );
}
