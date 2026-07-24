import { ArrowLeft, Building2 } from "lucide-react";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { SESSION_COOKIE_NAME } from "@/modules/auth/constants/session-cookie";
import { AuthService } from "@/modules/auth/services/auth.service";
import { AuthorizationService } from "@/modules/auth/services/authorization.service";
import type { AuthPrincipal } from "@/modules/auth/types/auth.types";
import { OrganizationForms } from "@/modules/business-units/components/organization-forms";
import { BusinessUnitService } from "@/modules/business-units/services/business-unit.service";
import { CountryService } from "@/modules/business-units/services/country.service";

export const metadata: Metadata = {
  title: "Organización | SGR-EG",
};

export const dynamic = "force-dynamic";

const authService = new AuthService();
const authorizationService = new AuthorizationService();
const businessUnitService = new BusinessUnitService();
const countryService = new CountryService();

export default async function OrganizationPage() {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    redirect("/login");
  }

  let principal: AuthPrincipal;

  try {
    principal = await authService.authenticate(token);
  } catch {
    redirect("/login");
  }

  if (principal.mustChangePassword) {
    redirect("/change-password");
  }

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
  const [countries, units] = await Promise.all([
    countryService.list(),
    businessUnitService.list(),
  ]);

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 dark:bg-slate-950">
      <section className="mx-auto max-w-7xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
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
            }))}
          />
          <CatalogList
            title="Unidades de negocio"
            emptyMessage="No existen unidades registradas."
            items={units.map((unit) => ({
              id: unit.id,
              primary: unit.name,
              secondary: `${unit.country.name} · ${unit.currency}`,
              status: unit.status,
            }))}
          />
        </div>
      </section>
    </main>
  );
}

function CatalogList({
  emptyMessage,
  items,
  title,
}: {
  emptyMessage: string;
  items: Array<{
    id: string;
    primary: string;
    secondary: string;
    status: "activo" | "inactivo";
  }>;
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
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                {item.status}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
