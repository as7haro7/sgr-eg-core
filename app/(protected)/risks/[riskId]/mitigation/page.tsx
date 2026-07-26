import { ArrowLeft, SlidersHorizontal } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { SectionTabs } from "@/components/ui/section-tabs";
import { isEvidenceStorageConfigured } from "@/config/env";
import { notFoundOnMissing } from "@/lib/page-error";
import { AuthorizationService } from "@/modules/auth/services/authorization.service";
import { getApplicationPrincipal } from "@/modules/auth/services/current-principal.service";
import { ControlPanel } from "@/modules/controls/components/control-panel";
import { ControlService } from "@/modules/controls/services/control.service";
import { MitigationPanel } from "@/modules/mitigation/components/mitigation-panel";
import { MitigationService } from "@/modules/mitigation/services/mitigation.service";
import { RiskService } from "@/modules/risks/services/risk.service";
import { riskIdSchema } from "@/modules/risks/validators/risk.validator";
import { EvidenceService } from "@/modules/shared/services/evidence.service";

export const metadata: Metadata = {
  title: "Controles y mitigación | SGR-EG",
};
export const dynamic = "force-dynamic";

const authorizationService = new AuthorizationService();
const controlService = new ControlService();
const mitigationService = new MitigationService();
const riskService = new RiskService();
const evidenceService = new EvidenceService();

interface PageProps {
  params: Promise<{ riskId: string }>;
}

export default async function RiskMitigationPage({ params }: PageProps) {
  const principal = await getApplicationPrincipal();

  const parsedRiskId = riskIdSchema.safeParse((await params).riskId);
  if (!parsedRiskId.success) notFound();
  const riskId = parsedRiskId.data;
  const risk = await notFoundOnMissing(
    riskService.getById(riskId, principal),
  );
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
  const [evidenceByEntityId, maxEvidenceFileSize] = await Promise.all([
    evidenceService.listRiskTreatment(
      riskId,
      {
        controlIds: overview.controls.map(({ id }) => id),
        planIds: plans.map(({ id }) => id),
        actionIds: plans.flatMap(({ actions }) => actions.map(({ id }) => id)),
      },
      principal,
    ),
    evidenceService.getMaxFileSize(),
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
        <SectionTabs
          active="treatment"
          label="Secciones del riesgo"
          tabs={[
            { id: "summary", label: "Resumen", href: `/risks/${risk.id}` },
            {
              id: "treatment",
              label: "Controles y mitigación",
              href: `/risks/${risk.id}/mitigation`,
            },
            {
              id: "evidence",
              label: "Evidencias",
              href: `/risks/${risk.id}?section=evidence`,
            },
          ]}
        />

        <div className="space-y-10 p-6">
          <div>
            <h2 className="mb-4 text-xl font-bold">Controles</h2>
            <ControlPanel
              riskId={risk.id}
              overview={overview}
              canCreate={canCreate}
              canUpdate={canUpdate}
              canDeactivate={canDeactivate}
              evidenceByControlId={evidenceByEntityId}
              maxEvidenceFileSize={maxEvidenceFileSize}
              storageConfigured={isEvidenceStorageConfigured()}
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
              evidenceByEntityId={evidenceByEntityId}
              maxEvidenceFileSize={maxEvidenceFileSize}
              storageConfigured={isEvidenceStorageConfigured()}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
