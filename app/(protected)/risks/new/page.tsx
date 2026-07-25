import { ArrowLeft, ShieldPlus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { AuthorizationService } from "@/modules/auth/services/authorization.service";
import { getApplicationPrincipal } from "@/modules/auth/services/current-principal.service";
import { BusinessUnitService } from "@/modules/business-units/services/business-unit.service";
import { RiskForm } from "@/modules/risks/components/risk-form";
import { RiskConfigurationService } from "@/modules/risks/services/risk-configuration.service";
import { RiskService } from "@/modules/risks/services/risk.service";

export const metadata: Metadata = { title: "Nuevo riesgo | SGR-EG" };
export const dynamic = "force-dynamic";

const authorizationService = new AuthorizationService();
const businessUnitService = new BusinessUnitService();
const riskConfigurationService = new RiskConfigurationService();
const riskService = new RiskService();

export default async function NewRiskPage() {
  const principal = await getApplicationPrincipal();
  const [categories, allUnits] = await Promise.all([
    riskConfigurationService.listCategories(),
    businessUnitService.listActive(),
  ]);
  const units = allUnits.filter((unit) =>
    authorizationService.isAllowed(principal, "riesgos", "create", {
      unitId: unit.id,
      ownerId: principal.userId,
      assigneeIds: [principal.userId],
    }),
  );
  const hasGlobalCreate = principal.permissions.some(
    ({ module, canCreate, scope }) =>
      module === "riesgos" && canCreate && scope === "global",
  );

  authorizationService.assertAllowed(
    principal,
    "riesgos",
    "create",
    units[0]
      ? {
          unitId: units[0].id,
          ownerId: principal.userId,
          assigneeIds: [principal.userId],
        }
      : {},
  );
  const owners = await riskService.listOwnerOptions(
    hasGlobalCreate ? undefined : units.map(({ id }) => id),
  );

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <header className="border-b border-slate-200 p-6">
        <Link
          href="/risks"
          className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-blue-700"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Volver al listado
        </Link>
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-blue-700 text-white">
            <ShieldPlus aria-hidden="true" className="size-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-950">Nuevo riesgo</h1>
            <p className="text-sm text-slate-600">
              Registra el contexto y revisa el cálculo antes de guardar.
            </p>
          </div>
        </div>
      </header>
      <RiskForm
        categories={categories.filter(({ status }) => status === "activo")}
        units={units}
        owners={owners}
      />
    </section>
  );
}
