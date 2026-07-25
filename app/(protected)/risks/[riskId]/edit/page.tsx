import { ArrowLeft, PencilLine } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { AuthorizationService } from "@/modules/auth/services/authorization.service";
import { getApplicationPrincipal } from "@/modules/auth/services/current-principal.service";
import { BusinessUnitService } from "@/modules/business-units/services/business-unit.service";
import { RiskForm } from "@/modules/risks/components/risk-form";
import { RiskConfigurationService } from "@/modules/risks/services/risk-configuration.service";
import { RiskService } from "@/modules/risks/services/risk.service";
import { riskIdSchema } from "@/modules/risks/validators/risk.validator";

export const metadata: Metadata = { title: "Editar riesgo | SGR-EG" };
export const dynamic = "force-dynamic";

const authorizationService = new AuthorizationService();
const businessUnitService = new BusinessUnitService();
const riskConfigurationService = new RiskConfigurationService();
const riskService = new RiskService();

interface EditRiskPageProps {
  params: Promise<{ riskId: string }>;
}

export default async function EditRiskPage({ params }: EditRiskPageProps) {
  const principal = await getApplicationPrincipal();
  const riskId = riskIdSchema.parse((await params).riskId);
  const risk = await riskService.getById(riskId, principal);
  authorizationService.assertAllowed(principal, "riesgos", "update", {
    unitId: risk.unit.id,
    ownerId: risk.createdBy.id,
    assigneeIds: risk.owner ? [risk.owner.id] : [],
  });
  const hasGlobalUpdate = principal.permissions.some(
    ({ module, canUpdate, scope }) =>
      module === "riesgos" && canUpdate && scope === "global",
  );
  const [categories, units, owners] = await Promise.all([
    riskConfigurationService.listCategories(),
    businessUnitService.listActive(),
    riskService.listOwnerOptions(
      hasGlobalUpdate ? undefined : [risk.unit.id],
    ),
  ]);

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <header className="border-b border-slate-200 p-6">
        <Link
          href={`/risks/${risk.id}`}
          className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-blue-700"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Volver al detalle
        </Link>
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-blue-700 text-white">
            <PencilLine aria-hidden="true" className="size-5" />
          </div>
          <div>
            <p className="font-mono text-sm text-slate-500">{risk.code}</p>
            <h1 className="text-2xl font-bold text-slate-950">Editar riesgo</h1>
          </div>
        </div>
      </header>
      <RiskForm
        risk={risk}
        categories={categories.filter(({ status }) => status === "activo")}
        units={units}
        owners={owners}
      />
    </section>
  );
}
