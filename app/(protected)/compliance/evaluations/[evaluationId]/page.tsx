import { ArrowLeft, BookCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { StatusBadge } from "@/components/ui/status-badge";
import { isEvidenceStorageConfigured } from "@/config/env";
import { AuthorizationService } from "@/modules/auth/services/authorization.service";
import { getApplicationPrincipal } from "@/modules/auth/services/current-principal.service";
import {
  evaluationResultLabels,
} from "@/modules/compliance/constants/evaluation";
import { EvaluationService } from "@/modules/compliance/services/evaluation.service";
import { evaluationIdSchema } from "@/modules/compliance/validators/evaluation.validator";
import { EvidencePanel } from "@/modules/shared/components/evidence-panel";
import { EvidenceService } from "@/modules/shared/services/evidence.service";

export const metadata: Metadata = {
  title: "Detalle de evaluación | SGR-EG",
};
export const dynamic = "force-dynamic";

const authorizationService = new AuthorizationService();
const evaluationService = new EvaluationService();
const evidenceService = new EvidenceService();

interface EvaluationDetailPageProps {
  params: Promise<{ evaluationId: string }>;
}

const resultTone = {
  conforme: "success",
  parcialmente_conforme: "warning",
  no_conforme: "danger",
  no_aplicable: "neutral",
} as const;

function formatDate(value: Date | null): string {
  if (!value) return "Sin fecha";
  return new Intl.DateTimeFormat("es-BO", {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(value);
}

export default async function EvaluationDetailPage({
  params,
}: EvaluationDetailPageProps) {
  const principal = await getApplicationPrincipal();
  const evaluationId = evaluationIdSchema.parse(
    (await params).evaluationId,
  );
  const evaluation = await evaluationService.getById(
    evaluationId,
    principal,
  );
  const context = {
    unitId: evaluation.unit.id,
    ownerId: evaluation.evaluator.id,
    assigneeIds: [
      evaluation.evaluator.id,
      ...(evaluation.planResponsible
        ? [evaluation.planResponsible.id]
        : []),
    ],
  };
  const canUpdate = authorizationService.isAllowed(
    principal,
    "cumplimiento",
    "update",
    context,
  );
  const [evidence, maxFileSize] = await Promise.all([
    evidenceService.list(
      { entityType: "evaluation", entityId: evaluation.id },
      principal,
    ),
    evidenceService.getMaxFileSize(),
  ]);

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <header className="border-b border-slate-200 p-6">
        <Link
          href="/compliance"
          className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-blue-700"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Volver a cumplimiento
        </Link>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-blue-700 text-white">
              <BookCheck aria-hidden="true" className="size-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-950">
                {evaluation.requirement.code} ·{" "}
                {evaluation.requirement.regulation.name}
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                {evaluation.unit.name} · versión{" "}
                {evaluation.requirement.version}
              </p>
            </div>
          </div>
          <StatusBadge tone={resultTone[evaluation.result]}>
            {evaluationResultLabels[evaluation.result]}
          </StatusBadge>
        </div>
      </header>

      <div className="grid gap-5 p-6 md:grid-cols-2 xl:grid-cols-4">
        <Detail label="Inicio" value={formatDate(evaluation.periodStart)} />
        <Detail label="Fin" value={formatDate(evaluation.periodEnd)} />
        <Detail label="Evaluador" value={evaluation.evaluator.name} />
        <Detail
          label="Jurisdicción"
          value={evaluation.requirement.regulation.jurisdiction}
        />
        <Detail
          label="Descripción del requisito"
          value={evaluation.requirement.description}
          wide
        />
        {evaluation.observations && (
          <Detail
            label="Observaciones"
            value={evaluation.observations}
            wide
          />
        )}
        {evaluation.notApplicableJustification && (
          <Detail
            label="Justificación de no aplicabilidad"
            value={evaluation.notApplicableJustification}
            wide
          />
        )}
        {evaluation.actionPlan && (
          <>
            <Detail
              label="Plan de acción"
              value={evaluation.actionPlan}
              wide
            />
            <Detail
              label="Responsable del plan"
              value={evaluation.planResponsible?.name ?? "Sin responsable"}
            />
            <Detail
              label="Fecha límite"
              value={formatDate(evaluation.planDeadline)}
            />
          </>
        )}
      </div>

      <section className="border-t border-slate-200 p-6">
        <h2 className="mb-4 text-lg font-bold text-slate-950">
          Evidencias
        </h2>
        <EvidencePanel
          entityType="evaluation"
          entityId={evaluation.id}
          evidence={evidence}
          canCreate={canUpdate}
          maxFileSizeBytes={maxFileSize}
          storageConfigured={isEvidenceStorageConfigured()}
        />
      </section>
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
      <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-800">
        {value}
      </p>
    </div>
  );
}
