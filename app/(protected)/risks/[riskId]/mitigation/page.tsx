import { ArrowLeft, SlidersHorizontal } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { AuthorizationService } from "@/modules/auth/services/authorization.service";
import { getApplicationPrincipal } from "@/modules/auth/services/current-principal.service";
import { ControlPanel } from "@/modules/controls/components/control-panel";
import { ControlService } from "@/modules/controls/services/control.service";
import { MitigationPanel } from "@/modules/mitigation/components/mitigation-panel";
import { MitigationService } from "@/modules/mitigation/services/mitigation.service";
import { RiskService } from "@/modules/risks/services/risk.service";
import { riskIdSchema } from "@/modules/risks/validators/risk.validator";

export const metadata: Metadata = {
  title: "Controles y mitigación | SGR-EG",
};
export const dynamic = "force-dynamic";

const authorizationService = new AuthorizationService();
const controlService = new ControlService();
const mitigationService = new MitigationService();
const riskService = new RiskService();

interface PageProps {
  params: Promise<{ riskId: string }>;
}

export default async function RiskMitigationPage({ params }: PageProps) {
  const principal = await getApplicationPrincipal();

  const riskId = riskIdSchema.parse((await params).riskId);
  const risk = await riskService.getById(riskId, principal);
  const context = {
    unitId: risk.unit.id,
    ownerId: risk.createdBy.id,
    assigneeIds: risk.owner ? [risk.owner.id] : [],
  };
  const canCreate = authorizationService.isAllowed(
    principal,
    "mitigacion",
    "create",
    context,
  );
  const canUpdate = authorizationService.isAllowed(
    principal,
    "mitigacion",
    "update",
    context,
  );
  const canDeactivate = authorizationService.isAllowed(
    principal,
    "mitigacion",
    "deactivate",
    context,
  );
  const [overview, plans] = await Promise.all([
    controlService.getOverview(riskId, principal),
    mitigationService.listByRisk(riskId, principal),
  ]);
  const needsOwners = canCreate || canUpdate;
  const hasGlobalAccess = principal.permissions.some(
    (permission) =>
      permission.module === "mitigacion" &&
      permission.scope === "global" &&
      (permission.canCreate || permission.canUpdate),
  );
  const owners = needsOwners
    ? await riskService.listOwnerOptions(
        hasGlobalAccess ? undefined : [risk.unit.id],
      )
    : [];

  return (
    <div className="w-full">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <header className="border-b border-slate-200 p-6 dark:border-slate-800">
          <Link
            href={`/risks/${risk.id}`}
            className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white"
          >
            <ArrowLeft className="size-4" />
            Volver al riesgo
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-slate-950 text-white dark:bg-white dark:text-slate-950">
              <SlidersHorizontal className="size-5" />
            </div>
            <div>
              <p className="font-mono text-sm text-slate-500">{risk.code}</p>
              <h1 className="text-2xl font-bold">Controles y mitigación</h1>
              <p className="text-sm text-slate-500">{risk.title}</p>
            </div>
          </div>
        </header>

        <div className="space-y-10 p-6">
          <div>
            <h2 className="mb-4 text-xl font-bold">Controles</h2>
            <ControlPanel
              riskId={risk.id}
              overview={overview}
              canCreate={canCreate}
              canUpdate={canUpdate}
              canDeactivate={canDeactivate}
            />
          </div>
          <div className="border-t border-slate-200 pt-8 dark:border-slate-800">
            <h2 className="mb-4 text-xl font-bold">Planes y acciones</h2>
            <MitigationPanel
              riskId={risk.id}
              plans={plans}
              owners={owners}
              canCreate={canCreate}
              canUpdate={canUpdate}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
