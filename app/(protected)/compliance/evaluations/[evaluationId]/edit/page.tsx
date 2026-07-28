import { ArrowLeft, Pencil } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { notFoundOnMissing } from "@/lib/page-error";
import { AuthorizationService } from "@/modules/auth/services/authorization.service";
import { getApplicationPrincipal } from "@/modules/auth/services/current-principal.service";
import { EvaluationForm } from "@/modules/compliance/components/evaluation-form";
import { EvaluationService } from "@/modules/compliance/services/evaluation.service";
import { evaluationIdSchema } from "@/modules/compliance/validators/evaluation.validator";

export const metadata: Metadata = {
  title: "Editar evaluación | SGR-EG",
};
export const dynamic = "force-dynamic";

const authorizationService = new AuthorizationService();
const evaluationService = new EvaluationService();

export default async function EditEvaluationPage({
  params,
}: {
  params: Promise<{ evaluationId: string }>;
}) {
  const principal = await getApplicationPrincipal();
  const parsed = evaluationIdSchema.safeParse((await params).evaluationId);
  if (!parsed.success) notFound();
  const evaluation = await notFoundOnMissing(
    evaluationService.getById(parsed.data, principal),
  );
  authorizationService.assertAllowed(
    principal,
    "cumplimiento",
    "update",
    {
      unitId: evaluation.unit.id,
      ownerId: evaluation.evaluator.id,
      assigneeIds: [
        evaluation.evaluator.id,
        ...(evaluation.planResponsible
          ? [evaluation.planResponsible.id]
          : []),
      ],
    },
  );
  const [requirements, units, users] = await Promise.all([
    evaluationService.listRequirementOptions(principal),
    evaluationService.listUnitOptions(principal),
    evaluationService.listUserOptions(principal),
  ]);

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <header className="border-b border-slate-200 p-6">
        <Link
          href={`/compliance/evaluations/${evaluation.id}`}
          className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-blue-700"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Volver al detalle
        </Link>
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-blue-700 text-white">
            <Pencil aria-hidden="true" className="size-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-950">
              Editar evaluación
            </h1>
            <p className="text-sm text-slate-600">
              La modificación quedará registrada en la bitácora.
            </p>
          </div>
        </div>
      </header>
      <EvaluationForm
        evaluation={evaluation}
        requirements={requirements}
        units={units}
        users={users}
      />
    </section>
  );
}
