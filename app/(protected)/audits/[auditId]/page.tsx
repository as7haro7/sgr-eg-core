import {
  ArrowLeft,
  ClipboardCheck,
  Pencil,
  UsersRound,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { SectionTabs } from "@/components/ui/section-tabs";
import { StatusBadge } from "@/components/ui/status-badge";
import { isEvidenceStorageConfigured } from "@/config/env";
import { notFoundOnMissing } from "@/lib/page-error";
import { AuthorizationService } from "@/modules/auth/services/authorization.service";
import { getApplicationPrincipal } from "@/modules/auth/services/current-principal.service";
import { AuditTransitionDialog } from "@/modules/audits/components/audit-transition-dialog";
import { auditStatusLabels } from "@/modules/audits/constants/audit";
import { AuditService } from "@/modules/audits/services/audit.service";
import { auditIdSchema } from "@/modules/audits/validators/audit.validator";
import { FindingPanel } from "@/modules/findings/components/finding-panel";
import { FindingService } from "@/modules/findings/services/finding.service";
import { EvidencePanel } from "@/modules/shared/components/evidence-panel";
import { EvidenceService } from "@/modules/shared/services/evidence.service";

export const metadata: Metadata = {
  title: "Detalle de auditoría | SGR-EG",
};

export const dynamic = "force-dynamic";

const auditService = new AuditService();
const authorizationService = new AuthorizationService();
const evidenceService = new EvidenceService();
const findingService = new FindingService();

interface AuditDetailPageProps {
  params: Promise<{ auditId: string }>;
  searchParams: Promise<{ section?: string | string[] }>;
}

function formatDate(value: Date | null): string {
  if (!value) return "Sin fecha definida";

  return new Intl.DateTimeFormat("es-BO", {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(value);
}

export default async function AuditDetailPage({
  params,
  searchParams,
}: AuditDetailPageProps) {
  const principal = await getApplicationPrincipal();
  const parsedAuditId = auditIdSchema.safeParse((await params).auditId);
  if (!parsedAuditId.success) notFound();
  const auditId = parsedAuditId.data;
  const rawSection = (await searchParams).section;
  const requestedSection = Array.isArray(rawSection)
    ? rawSection[0]
    : rawSection;
  const activeSection = ["team", "findings", "evidence"].includes(
    requestedSection ?? "",
  )
    ? requestedSection!
    : "summary";
  const audit = await notFoundOnMissing(
    auditService.getById(auditId, principal),
  );
  const context = {
    unitId: audit.unit?.id,
    ownerId: audit.responsible.id,
    assigneeIds: [
      audit.responsible.id,
      ...audit.team.map(({ id }) => id),
    ],
  };
  const canUpdate = authorizationService.isAllowed(
    principal,
    "auditorias",
    "update",
    context,
  );
  const transitions = canUpdate
    ? await auditService.listAvailableTransitions(audit.id, principal)
    : [];
  const [evidence, maxEvidenceFileSize] = await Promise.all([
    evidenceService.list(
      { entityType: "audit", entityId: audit.id },
      principal,
    ),
    evidenceService.getMaxFileSize(),
  ]);
  const [findings, findingUsers, findingRiskOptions] =
    activeSection === "findings"
      ? await Promise.all([
          findingService.list(audit.id, principal),
          auditService.listUserOptions(),
          findingService.listRiskOptions(audit.id, principal),
        ])
      : [[], [], []];
  const evidenceByFinding =
    activeSection === "findings"
      ? await Promise.all(
          findings.map(async (finding) => ({
            findingId: finding.id,
            items: await evidenceService.list(
              { entityType: "finding", entityId: finding.id },
              principal,
            ),
          })),
        )
      : [];

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <header className="border-b border-slate-200 p-6">
        <Link
          href="/audits"
          className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-blue-700"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Volver a auditorías
        </Link>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-blue-700 text-white">
              <ClipboardCheck aria-hidden="true" className="size-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-950">
                {audit.objective}
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                {audit.unit?.name ?? "Alcance corporativo"}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {canUpdate && !["cerrada", "cancelada"].includes(audit.status) && (
              <Link
                href={`/audits/${audit.id}/edit`}
                className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Pencil aria-hidden="true" className="size-4" />
                Editar
              </Link>
            )}
            <StatusBadge tone={audit.status === "cerrada" ? "success" : audit.status === "cancelada" ? "danger" : "info"}>
              {auditStatusLabels[audit.status]}
            </StatusBadge>
            {transitions.length > 0 && (
              <AuditTransitionDialog
                auditId={audit.id}
                transitions={transitions}
              />
            )}
          </div>
        </div>
      </header>

      <SectionTabs
        active={activeSection}
        label="Secciones de la auditoría"
        tabs={[
          { id: "summary", label: "Resumen", href: `/audits/${audit.id}` },
          {
            id: "team",
            label: "Equipo auditor",
            href: `/audits/${audit.id}?section=team`,
          },
          {
            id: "findings",
            label: `Hallazgos (${audit.findingCount})`,
            href: `/audits/${audit.id}?section=findings`,
          },
          {
            id: "evidence",
            label: "Evidencias",
            href: `/audits/${audit.id}?section=evidence`,
          },
        ]}
      />

      {activeSection === "summary" && (
      <div className="grid gap-6 p-6 md:grid-cols-2 xl:grid-cols-4">
        <Detail label="Inicio" value={formatDate(audit.startDate)} />
        <Detail label="Finalización" value={formatDate(audit.endDate)} />
        <Detail label="Responsable" value={audit.responsible.name} />
        <Detail label="Hallazgos" value={String(audit.findingCount)} />
        <Detail label="Alcance" value={audit.scope} wide />
      </div>
      )}

      {activeSection === "team" && (
      <section className="border-t border-slate-200 p-6">
        <div className="mb-4 flex items-center gap-2">
          <UsersRound aria-hidden="true" className="size-5 text-blue-700" />
          <h2 className="text-lg font-bold text-slate-950">Equipo auditor</h2>
        </div>
        {audit.team.length > 0 ? (
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {audit.team.map((member) => (
              <li key={member.id} className="rounded-xl bg-slate-50 p-4">
                <p className="font-semibold text-slate-950">{member.name}</p>
                <p className="mt-1 text-sm text-slate-600">
                  {member.function ?? "Integrante"}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">
            No se registraron integrantes adicionales.
          </p>
        )}
      </section>
      )}

      {activeSection === "evidence" && (
      <section className="border-t border-slate-200 p-6">
        <h2 className="mb-4 text-lg font-bold text-slate-950">Evidencias</h2>
        <EvidencePanel
          entityType="audit"
          entityId={audit.id}
          evidence={evidence}
          canCreate={canUpdate}
          maxFileSizeBytes={maxEvidenceFileSize}
          storageConfigured={isEvidenceStorageConfigured()}
        />
      </section>
      )}

      {activeSection === "findings" && (
      <section className="border-t border-slate-200 p-6">
        <FindingPanel
          auditId={audit.id}
          findings={findings}
          users={findingUsers}
          riskOptions={findingRiskOptions}
          evidenceByFinding={evidenceByFinding}
          canUpdate={canUpdate}
          maxFileSizeBytes={maxEvidenceFileSize}
          storageConfigured={isEvidenceStorageConfigured()}
        />
      </section>
      )}
    </section>
  );
}

function Detail({
  label,
  value,
  wide = false,
}: {
  label: string;
  value: string;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "md:col-span-2 xl:col-span-4" : ""}>
      <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
        {label}
      </p>
      <p className="mt-1 text-sm leading-6 text-slate-800">{value}</p>
    </div>
  );
}
