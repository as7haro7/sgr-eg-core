import { ArrowLeft, ShieldAlert } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import type { estado_riesgo } from "@/generated/prisma/client";
import { AuthorizationService } from "@/modules/auth/services/authorization.service";
import { getApplicationPrincipal } from "@/modules/auth/services/current-principal.service";
import { BusinessUnitService } from "@/modules/business-units/services/business-unit.service";
import {
  riskStatuses,
  riskStatusLabels,
} from "@/modules/risks/constants/risk-status";
import { RiskForm } from "@/modules/risks/components/risk-form";
import { RiskConfigurationService } from "@/modules/risks/services/risk-configuration.service";
import { RiskService } from "@/modules/risks/services/risk.service";
import { listRisksQuerySchema } from "@/modules/risks/validators/risk.validator";

export const metadata: Metadata = {
  title: "Riesgos | SGR-EG",
};

export const dynamic = "force-dynamic";

const authorizationService = new AuthorizationService();
const businessUnitService = new BusinessUnitService();
const riskConfigurationService = new RiskConfigurationService();
const riskService = new RiskService();

interface RisksPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function RisksPage({ searchParams }: RisksPageProps) {
  const principal = await getApplicationPrincipal();

  const raw = await searchParams;
  const first = (value: string | string[] | undefined) =>
    Array.isArray(value) ? value[0] : value;
  const query = listRisksQuerySchema.parse({
    page: first(raw.page),
    pageSize: first(raw.pageSize),
    search: first(raw.search),
    status: first(raw.status) || undefined,
    categoryId: first(raw.categoryId) || undefined,
    unitId: first(raw.unitId) || undefined,
    ownerId: first(raw.ownerId) || undefined,
  });
  const pageHref = (page: number) => {
    const parameters = new URLSearchParams();

    parameters.set("page", String(page));
    parameters.set("pageSize", String(query.pageSize));
    if (query.search) parameters.set("search", query.search);
    if (query.status) parameters.set("status", query.status);
    if (query.categoryId) parameters.set("categoryId", query.categoryId);
    if (query.unitId) parameters.set("unitId", query.unitId);
    if (query.ownerId) parameters.set("ownerId", query.ownerId);

    return `/risks?${parameters.toString()}`;
  };
  const [risks, categories, allUnits] = await Promise.all([
    riskService.list(query, principal),
    riskConfigurationService.listCategories(),
    businessUnitService.listActive(),
  ]);
  const createUnits = allUnits.filter((unit) =>
    authorizationService.isAllowed(
      principal,
      "riesgos",
      "create",
      {
        unitId: unit.id,
        ownerId: principal.userId,
        assigneeIds: [principal.userId],
      },
    ),
  );
  const canCreate = createUnits.length > 0;
  const hasGlobalCreate = principal.permissions.some(
    (permission) =>
      permission.module === "riesgos" &&
      permission.canCreate &&
      permission.scope === "global",
  );
  const owners = canCreate
    ? await riskService.listOwnerOptions(
        hasGlobalCreate ? undefined : createUnits.map(({ id }) => id),
      )
    : [];
  const activeCategories = categories.filter(
    ({ status }) => status === "activo",
  );

  return (
    <div className="w-full">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <header className="border-b border-slate-200 p-6 dark:border-slate-800">
          <Link
            href="/"
            className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white"
          >
            <ArrowLeft className="size-4" />
            Volver
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-slate-950 text-white dark:bg-white dark:text-slate-950">
              <ShieldAlert className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-950 dark:text-white">
                Riesgos
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                {risks.total} riesgo{risks.total === 1 ? "" : "s"} dentro de tu alcance
              </p>
            </div>
          </div>
        </header>

        {canCreate && (
          <RiskForm
            categories={activeCategories}
            units={createUnits}
            owners={owners}
          />
        )}

        <form
          className="grid gap-3 border-b border-slate-200 bg-slate-50 p-4 sm:grid-cols-2 lg:grid-cols-5 dark:border-slate-800 dark:bg-slate-950/40"
          method="get"
        >
          <input
            name="search"
            defaultValue={query.search}
            placeholder="Código, título o descripción"
            className="form-input lg:col-span-2"
          />
          <select name="status" defaultValue={query.status ?? ""} className="form-input">
            <option value="">Todos los estados</option>
            {riskStatuses.map((status) => (
              <option key={status} value={status}>{riskStatusLabels[status]}</option>
            ))}
          </select>
          <select name="categoryId" defaultValue={query.categoryId ?? ""} className="form-input">
            <option value="">Todas las categorías</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>
          <button
            type="submit"
            className="h-10 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white dark:bg-white dark:text-slate-950"
          >
            Filtrar
          </button>
        </form>

        <div className="overflow-x-auto">
          <table className="w-full min-w-4xl text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-600 dark:bg-slate-950/50 dark:text-slate-400">
              <tr>
                <th className="px-6 py-3">Riesgo</th>
                <th className="px-6 py-3">Unidad / categoría</th>
                <th className="px-6 py-3">Propietario</th>
                <th className="px-6 py-3">Inherente</th>
                <th className="px-6 py-3">Residual</th>
                <th className="px-6 py-3">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {risks.items.map((risk) => (
                <tr key={risk.id}>
                  <td className="px-6 py-4">
                    <Link
                      href={`/risks/${risk.id}`}
                      className="font-semibold text-slate-950 hover:underline dark:text-white"
                    >
                      {risk.code} · {risk.title}
                    </Link>
                    <p className="mt-1 max-w-md truncate text-slate-500">
                      {risk.description}
                    </p>
                  </td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                    {risk.unit.name}
                    <br />
                    {risk.category.name}
                  </td>
                  <td className="px-6 py-4">
                    {risk.owner?.name ?? "Pendiente"}
                  </td>
                  <td className="px-6 py-4 font-mono font-bold">
                    {risk.inherentLevel}
                  </td>
                  <td className="px-6 py-4 font-mono font-bold">
                    {risk.residualLevel}
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={risk.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {risks.items.length === 0 && (
            <p className="p-8 text-center text-sm text-slate-500">
              No existen riesgos para los filtros seleccionados.
            </p>
          )}
        </div>
        {risks.totalPages > 1 && (
          <nav className="flex items-center justify-between border-t border-slate-200 px-6 py-4 text-sm dark:border-slate-800">
            <span>
              Página {risks.page} de {risks.totalPages}
            </span>
            <div className="flex gap-2">
              {risks.page > 1 && (
                <Link
                  href={pageHref(risks.page - 1)}
                  className="rounded-lg border border-slate-300 px-3 py-2 font-medium dark:border-slate-700"
                >
                  Anterior
                </Link>
              )}
              {risks.page < risks.totalPages && (
                <Link
                  href={pageHref(risks.page + 1)}
                  className="rounded-lg border border-slate-300 px-3 py-2 font-medium dark:border-slate-700"
                >
                  Siguiente
                </Link>
              )}
            </div>
          </nav>
        )}
      </section>
    </div>
  );
}

function StatusBadge({ status }: { status: estado_riesgo }) {
  return (
    <span className="whitespace-nowrap rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold dark:bg-slate-800">
      {riskStatusLabels[status]}
    </span>
  );
}
