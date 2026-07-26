import { Building2, Flag } from "lucide-react";
import type { Metadata } from "next";

import { AdministrationNav } from "@/components/layout/administration-nav";
import { SectionTabs } from "@/components/ui/section-tabs";
import { AuthorizationService } from "@/modules/auth/services/authorization.service";
import { getApplicationPrincipal } from "@/modules/auth/services/current-principal.service";
import { OrganizationActions } from "@/modules/business-units/components/organization-actions";
import { OrganizationForms } from "@/modules/business-units/components/organization-forms";
import { BusinessUnitService } from "@/modules/business-units/services/business-unit.service";
import { CountryService } from "@/modules/business-units/services/country.service";

export const metadata: Metadata = { title: "Organización | SGR-EG" };
export const dynamic = "force-dynamic";

const authorizationService = new AuthorizationService();
const businessUnitService = new BusinessUnitService();
const countryService = new CountryService();

export default async function OrganizationPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  const principal = await getApplicationPrincipal();
  authorizationService.assertAllowed(principal, "organizacion", "read");
  const rawTab = (await searchParams).tab;
  const activeTab = (Array.isArray(rawTab) ? rawTab[0] : rawTab) === "units"
    ? "units"
    : "countries";
  const canCreate = authorizationService.isAllowed(principal, "organizacion", "create");
  const canUpdate = authorizationService.isAllowed(principal, "organizacion", "update");
  const canDeactivate = authorizationService.isAllowed(principal, "organizacion", "deactivate");
  const [countries, units] = await Promise.all([
    countryService.list(),
    businessUnitService.list(),
  ]);
  const items = activeTab === "countries"
    ? countries.map((country) => ({
        id: country.id,
        name: country.name,
        detail: `Código ISO: ${country.isoCode}`,
        status: country.status,
        type: "country" as const,
        isoCode: country.isoCode,
      }))
    : units.map((unit) => ({
        id: unit.id,
        name: unit.name,
        detail: `${unit.country.name} · ${unit.currency}`,
        status: unit.status,
        type: "unit" as const,
        countryId: unit.country.id,
        currency: unit.currency,
      }));

  return (
    <div className="w-full">
      <AdministrationNav active="organization" principal={principal} />
      <section className="surface-card overflow-hidden">
        <header className="flex flex-col gap-4 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-blue-700 text-white">
              <Building2 aria-hidden="true" className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-950">Organización</h1>
              <p className="text-sm text-slate-600">
                Define dónde opera el sistema antes de asignar usuarios y riesgos.
              </p>
            </div>
          </div>
          {canCreate && <OrganizationForms countries={countries} section={activeTab} />}
        </header>
        <SectionTabs
          active={activeTab}
          label="Catálogos de organización"
          tabs={[
            { id: "countries", label: `Países (${countries.length})`, description: "Catálogo geográfico", href: "/organization?tab=countries" },
            { id: "units", label: `Unidades (${units.length})`, description: "Operación y moneda", href: "/organization?tab=units" },
          ]}
        />
        <section className="p-5 sm:p-6">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-slate-950">
              {activeTab === "countries" ? "Países registrados" : "Unidades de negocio"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {activeTab === "countries"
                ? "Un país puede agrupar varias unidades de negocio."
                : "Cada unidad hereda el país y define su moneda operativa."}
            </p>
          </div>
          {items.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center">
              {activeTab === "countries"
                ? <Flag aria-hidden="true" className="mx-auto size-8 text-slate-400" />
                : <Building2 aria-hidden="true" className="mx-auto size-8 text-slate-400" />}
              <p className="mt-3 font-semibold text-slate-800">
                No hay {activeTab === "countries" ? "países" : "unidades"} registrados
              </p>
            </div>
          ) : (
            <ul className="grid gap-3 lg:grid-cols-2">
              {items.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 p-4">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-950">{item.name}</p>
                    <p className="mt-1 text-sm text-slate-500">{item.detail}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className={item.status === "activo"
                      ? "rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800"
                      : "rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600"}>
                      {item.status === "activo" ? "Activo" : "Inactivo"}
                    </span>
                    <OrganizationActions
                      id={item.id}
                      type={item.type}
                      status={item.status}
                      currentName={item.name}
                      currentIsoCode={"isoCode" in item ? item.isoCode : undefined}
                      currentCountryId={"countryId" in item ? item.countryId : undefined}
                      currentCurrency={"currency" in item ? item.currency : undefined}
                      countries={countries}
                      canUpdate={canUpdate}
                      canDeactivate={canDeactivate}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </section>
    </div>
  );
}
