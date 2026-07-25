import { ArrowLeft, Settings2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { AuthorizationService } from "@/modules/auth/services/authorization.service";
import { getApplicationPrincipal } from "@/modules/auth/services/current-principal.service";
import { BusinessUnitService } from "@/modules/business-units/services/business-unit.service";
import { RiskConfigurationForms } from "@/modules/risks/components/risk-configuration-forms";
import { RiskConfigurationService } from "@/modules/risks/services/risk-configuration.service";
import { SystemParameterEditor } from "@/modules/shared/components/system-parameter-editor";
import { SystemParameterService } from "@/modules/shared/services/system-parameter.service";
import { OrganizationActions } from "@/modules/business-units/components/organization-actions";
import { AlertEngineButton } from "@/modules/alerts/components/alert-engine-button";

export const metadata: Metadata = {
  title: "Configuración | SGR-EG",
};

export const dynamic = "force-dynamic";

const authorizationService = new AuthorizationService();
const businessUnitService = new BusinessUnitService();
const riskConfigurationService = new RiskConfigurationService();
const systemParameterService = new SystemParameterService();

interface SettingsPageProps {
  searchParams: Promise<{ tab?: string | string[] }>;
}

const settingsTabs = [
  { id: "categories", label: "Categorías" },
  { id: "appetites", label: "Apetitos" },
  { id: "parameters", label: "Parámetros" },
  { id: "system", label: "Sistema" },
  { id: "audit-log", label: "Bitácora" },
] as const;

export default async function SettingsPage({
  searchParams,
}: SettingsPageProps) {
  const principal = await getApplicationPrincipal();
  const rawTab = (await searchParams).tab;
  const requestedTab = Array.isArray(rawTab) ? rawTab[0] : rawTab;
  const activeTab =
    settingsTabs.find(({ id }) => id === requestedTab)?.id ?? "categories";

  authorizationService.assertAllowed(
    principal,
    "organizacion",
    "read",
  );

  const canCreate = authorizationService.isAllowed(
    principal,
    "organizacion",
    "create",
  );
  const canUpdate = authorizationService.isAllowed(
    principal,
    "organizacion",
    "update",
  );
  const [categories, appetites, units, parameters] = await Promise.all([
    riskConfigurationService.listCategories(),
    riskConfigurationService.listAppetites(),
    businessUnitService.list(),
    systemParameterService.list(),
  ]);

  return (
    <div className="w-full">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <header className="border-b border-slate-200 p-6 dark:border-slate-800">
          <Link
            href="/"
            className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Volver
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-slate-950 text-white dark:bg-white dark:text-slate-950">
              <Settings2 aria-hidden="true" className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-950 dark:text-white">
                Configuración
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Categorías, apetito de riesgo y parámetros operativos
              </p>
            </div>
          </div>
        </header>

        <nav
          aria-label="Secciones de configuración"
          className="overflow-x-auto border-b border-slate-200 px-4"
        >
          <div className="flex min-w-max gap-1">
            {settingsTabs.map((tab) => (
              <Link
                key={tab.id}
                href={`/settings?tab=${tab.id}`}
                aria-current={activeTab === tab.id ? "page" : undefined}
                className={
                  activeTab === tab.id
                    ? "border-b-2 border-blue-700 px-4 py-3 text-sm font-semibold text-blue-700"
                    : "border-b-2 border-transparent px-4 py-3 text-sm font-medium text-slate-600 hover:text-slate-950"
                }
              >
                {tab.label}
              </Link>
            ))}
          </div>
        </nav>

        {canCreate && ["categories", "appetites", "parameters"].includes(activeTab) && (
          <RiskConfigurationForms
            categories={categories}
            units={units}
            section={activeTab as "categories" | "appetites" | "parameters"}
          />
        )}

        {activeTab === "categories" && (
          <section className="p-6">
            <h2 className="text-lg font-bold text-slate-950 dark:text-white">
              Categorías de riesgo
            </h2>
            <ul className="mt-4 divide-y divide-slate-200 dark:divide-slate-800">
              {categories.map((category) => (
                <li
                  key={category.id}
                  className="flex items-start justify-between gap-4 py-3"
                >
                  <div>
                    <p className="font-semibold text-slate-950 dark:text-white">
                      {category.name}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Apetito base: {category.baseAppetite}
                      {category.description
                        ? ` · ${category.description}`
                        : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={category.status} />
                    <OrganizationActions
                      id={category.id}
                      type="category"
                      status={category.status}
                      currentName={category.name}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}
        {activeTab === "appetites" && (
          <section className="p-6">
            <h2 className="text-lg font-bold text-slate-950 dark:text-white">
              Historial de apetito
            </h2>
            {appetites.length === 0 ? (
              <EmptyState message="Aún no existen vigencias configuradas." />
            ) : (
              <ul className="mt-4 divide-y divide-slate-200 dark:divide-slate-800">
                {appetites.map((appetite) => (
                  <li key={appetite.id} className="py-3">
                    <div className="flex items-center justify-between gap-4">
                      <p className="font-semibold text-slate-950 dark:text-white">
                        {appetite.category.name}
                      </p>
                      <span className="font-mono text-sm font-bold">
                        {appetite.threshold}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      {appetite.unit?.name ?? "Todas las unidades"} ·{" "}
                      {formatDate(appetite.validFrom)} —{" "}
                      {appetite.validUntil
                        ? formatDate(appetite.validUntil)
                        : "Sin fecha final"}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {activeTab === "parameters" && (
        <section className="p-6">
          <h2 className="text-lg font-bold text-slate-950 dark:text-white">
            Parámetros del sistema
          </h2>
          <div className="mt-4 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {parameters.map((parameter) =>
              canUpdate ? (
                <SystemParameterEditor
                  key={parameter.key}
                  parameter={parameter}
                />
              ) : (
                <article
                  key={parameter.key}
                  className="rounded-xl border border-slate-200 p-4 dark:border-slate-800"
                >
                  <h3 className="font-mono text-sm font-bold">
                    {parameter.key}
                  </h3>
                  <pre className="mt-3 overflow-auto text-sm">
                    {JSON.stringify(parameter.value, null, 2)}
                  </pre>
                  <p className="mt-3 text-sm text-slate-500">
                    {parameter.description}
                  </p>
                </article>
              ),
            )}
          </div>
        </section>
        )}

        {activeTab === "system" && (
          <section className="p-6">
            <h2 className="text-lg font-bold text-slate-950 dark:text-white">
              Sistema y Alertas
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Controles manuales para tareas programadas y procesos en segundo plano.
            </p>
            <div className="mt-6">
              {canCreate ? (
                <AlertEngineButton />
              ) : (
                <EmptyState message="No tienes permisos para ejecutar procesos del sistema." />
              )}
            </div>
          </section>
        )}

        {activeTab === "audit-log" && (
          <section className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-950 dark:text-white">
                  Bitácora de Auditoría
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Consulta el registro de actividades del sistema.
                </p>
              </div>
              <Link 
                href="/settings/audit-log" 
                className="inline-flex h-9 items-center justify-center rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white hover:bg-blue-800"
              >
                Abrir Bitácora
              </Link>
            </div>
          </section>
        )}
      </section>
    </div>
  );
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("es-BO", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(date);
}

function EmptyState({ message }: { message: string }) {
  return (
    <p className="mt-4 rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-slate-700">
      {message}
    </p>
  );
}

function StatusBadge({
  status,
}: {
  status: "activo" | "inactivo";
}) {
  return (
    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
      {status}
    </span>
  );
}
