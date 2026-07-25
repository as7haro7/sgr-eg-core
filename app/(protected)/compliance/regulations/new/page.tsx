import { ArrowLeft, BookPlus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { AuthorizationService } from "@/modules/auth/services/authorization.service";
import { getApplicationPrincipal } from "@/modules/auth/services/current-principal.service";
import { BusinessUnitService } from "@/modules/business-units/services/business-unit.service";
import { CountryService } from "@/modules/business-units/services/country.service";
import { RegulationForm } from "@/modules/regulations/components/regulation-form";

export const metadata: Metadata = {
  title: "Nueva normativa | SGR-EG",
};
export const dynamic = "force-dynamic";

const authorization = new AuthorizationService();
const businessUnitService = new BusinessUnitService();
const countryService = new CountryService();

export default async function NewRegulationPage() {
  const principal = await getApplicationPrincipal();
  authorization.assertAllowed(principal, "cumplimiento", "create");

  const [countries, units] = await Promise.all([
    countryService.list(),
    businessUnitService.listActive(),
  ]);
  const hasGlobalCreate = principal.permissions.some(
    ({ module, canCreate, scope }) =>
      module === "cumplimiento" && canCreate && scope === "global",
  );
  const allowedCountryIds = new Set(
    units
      .filter(({ id }) => principal.unitIds.includes(id))
      .map(({ country }) => country.id),
  );
  const availableCountries = hasGlobalCreate
    ? countries
    : countries.filter(({ id }) => allowedCountryIds.has(id));

  return (
    <div className="space-y-6">
      <header>
        <Link
          href="/compliance/regulations"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-950"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Volver a normativas
        </Link>
        <div className="mt-4 flex items-center gap-3">
          <BookPlus aria-hidden="true" className="size-8 text-blue-700" />
          <div>
            <h1 className="text-2xl font-bold text-slate-950">
              Nueva normativa
            </h1>
            <p className="text-sm text-slate-600">
              Registra la jurisdicción, versión y periodo de vigencia.
            </p>
          </div>
        </div>
      </header>
      <RegulationForm countries={availableCountries} />
    </div>
  );
}
