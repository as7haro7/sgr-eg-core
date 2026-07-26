import { ArrowLeft, Building2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { AuthorizationService } from "@/modules/auth/services/authorization.service";
import { getApplicationPrincipal } from "@/modules/auth/services/current-principal.service";
import { OrganizationForms } from "@/modules/business-units/components/organization-forms";
import { BusinessUnitService } from "@/modules/business-units/services/business-unit.service";
import { CountryService } from "@/modules/business-units/services/country.service";
import { OrganizationActions } from "@/modules/business-units/components/organization-actions";

export const metadata: Metadata = {
  title: "Organización | SGR-EG",
};

export const dynamic = "force-dynamic";

const authorizationService = new AuthorizationService();
const businessUnitService = new BusinessUnitService();
const countryService = new CountryService();

export default async function OrganizationPage() {
  const principal = await getApplicationPrincipal();

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
  const canDeactivate = authorizationService.isAllowed(
    principal,
    "organizacion",
    "deactivate",
  );
  const [countries, units] = await Promise.all([
    countryService.list(),
    businessUnitService.list(),
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
              <Building2 aria-hidden="true" className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-950 dark:text-white">
                Organización
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Países y unidades de negocio
              </p>
            </div>
          </div>
        </header>

        {canCreate && <OrganizationForms countries={countries} />}

        <div className="grid lg:grid-cols-2 lg:divide-x lg:divide-slate-200 dark:lg:divide-slate-800">
          <CatalogList
            title="Países"
            emptyMessage="No existen países registrados."
            items={countries.map((country) => ({
              id: country.id,
              primary: country.name,
              secondary: country.isoCode,
              status: country.status,
              type: "country" as const,
              isoCode: country.isoCode,
            }))}
            countries={countries}
            canUpdate={canUpdate}
            canDeactivate={canDeactivate}
          />
          <CatalogList
            title="Unidades de negocio"
            emptyMessage="No existen unidades registradas."
            items={units.map((unit) => ({
              id: unit.id,
              primary: unit.name,
              secondary: `${unit.country.name} · ${unit.currency}`,
              status: unit.status,
              type: "unit" as const,
              countryId: unit.country.id,
              currency: unit.currency,
            }))}
            countries={countries}
            canUpdate={canUpdate}
            canDeactivate={canDeactivate}
          />
        </div>
      </section>
    </div>
  );
}

function CatalogList({
  emptyMessage,
  items,
  title,
  countries,
  canUpdate,
  canDeactivate,
}: {
  emptyMessage: string;
  items: Array<{
    id: string;
    primary: string;
    secondary: string;
    status: "activo" | "inactivo";
    type: "country" | "unit";
    isoCode?: string;
    countryId?: string;
    currency?: string;
  }>;
  countries: Awaited<ReturnType<CountryService["list"]>>;
  canUpdate: boolean;
  canDeactivate: boolean;
  title: string;
}) {
  return (
    <section className="p-6">
      <h2 className="text-lg font-bold text-slate-950 dark:text-white">
        {title}
      </h2>
      {items.length === 0 ? (
        <p className="mt-4 rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
          {emptyMessage}
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-slate-200 dark:divide-slate-800">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between gap-4 py-3"
            >
              <div>
                <p className="font-semibold text-slate-950 dark:text-white">
                  {item.primary}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {item.secondary}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  {item.status}
                </span>
                <OrganizationActions
                  id={item.id}
                  type={item.type}
                  status={item.status}
                  currentName={item.primary}
                  currentIsoCode={item.isoCode}
                  currentCountryId={item.countryId}
                  currentCurrency={item.currency}
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
  );
}
