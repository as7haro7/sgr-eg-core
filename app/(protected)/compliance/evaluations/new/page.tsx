import { ArrowLeft, ClipboardPlus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { AuthorizationService } from "@/modules/auth/services/authorization.service";
import { getApplicationPrincipal } from "@/modules/auth/services/current-principal.service";
import { EvaluationForm } from "@/modules/compliance/components/evaluation-form";
import { EvaluationService } from "@/modules/compliance/services/evaluation.service";

export const metadata: Metadata = {
  title: "Nueva evaluación | SGR-EG",
};
export const dynamic = "force-dynamic";

const authorizationService = new AuthorizationService();
const evaluationService = new EvaluationService();

export default async function NewEvaluationPage() {
  const principal = await getApplicationPrincipal();
  const units = await evaluationService.listUnitOptions(principal);
  authorizationService.assertAllowed(
    principal,
    "cumplimiento",
    "create",
    units[0]
      ? {
          unitId: units[0].id,
          ownerId: principal.userId,
          assigneeIds: [principal.userId],
        }
      : {},
  );
  const [requirements, users] = await Promise.all([
    evaluationService.listRequirementOptions(principal),
    evaluationService.listUserOptions(principal),
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
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-blue-700 text-white">
            <ClipboardPlus aria-hidden="true" className="size-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-950">
              Nueva evaluación
            </h1>
            <p className="text-sm text-slate-600">
              Evalúa un requisito para una unidad y periodo determinados.
            </p>
          </div>
        </div>
      </header>
      {requirements.length > 0 && units.length > 0 ? (
        <EvaluationForm
          requirements={requirements}
          units={units}
          users={users}
        />
      ) : (
        <p className="m-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          Necesitas al menos un requisito vigente y una unidad activa dentro
          de tu alcance antes de registrar una evaluación.
        </p>
      )}
    </section>
  );
}
