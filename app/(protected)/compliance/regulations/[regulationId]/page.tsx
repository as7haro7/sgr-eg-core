import { ArrowLeft, BookCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { StatusBadge } from "@/components/ui/status-badge";
import { getApplicationPrincipal } from "@/modules/auth/services/current-principal.service";
import { RegulationService } from "@/modules/regulations/services/regulation.service";
import { RequirementList } from "@/modules/regulations/components/requirement-list";

export const metadata: Metadata = {
  title: "Detalle de Normativa | SGR-EG",
};
export const dynamic = "force-dynamic";

const regulationService = new RegulationService();

interface RegulationDetailPageProps {
  params: Promise<{ regulationId: string }>;
}

export default async function RegulationDetailPage({
  params,
}: RegulationDetailPageProps) {
  const principal = await getApplicationPrincipal();
  const { regulationId } = await params;
  
  try {
    const regulation = await regulationService.getRegulationById(regulationId, principal);
    const requirementsResult = await regulationService.listRequirements(
      regulationId,
      { page: 1, pageSize: 500, active: undefined }, 
      principal
    );
    const requirements = requirementsResult.items;

    const canUpdate = principal.permissions.some(
      ({ module, canUpdate }) => module === "cumplimiento" && canUpdate,
    );

    return (
      <div className="space-y-6">
        <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <Link
            href="/compliance/regulations"
            className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-950"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Volver al catálogo
          </Link>
          
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                  <BookCheck aria-hidden="true" className="size-6" />
                </div>
                <h1 className="text-2xl font-bold text-slate-950">
                  {regulation.name}
                </h1>
              </div>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
                Jurisdicción: {regulation.jurisdiction || "General"}
              </p>
            </div>
            <StatusBadge tone={regulation.status === "vigente" ? "success" : "neutral"}>
              {regulation.status}
            </StatusBadge>
          </div>

          <dl className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
              <dt className="text-sm font-medium text-slate-500">Jurisdicción</dt>
              <dd className="mt-1 text-sm font-semibold text-slate-950">
                {regulation.jurisdiction}
              </dd>
            </div>
            <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
              <dt className="text-sm font-medium text-slate-500">Versión</dt>
              <dd className="mt-1 text-sm font-semibold capitalize text-slate-950">
                {regulation.version || "1.0"}
              </dd>
            </div>
            <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
              <dt className="text-sm font-medium text-slate-500">Requisitos asociados</dt>
              <dd className="mt-1 text-sm font-semibold text-slate-950">
                {requirements.length}
              </dd>
            </div>
            <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
              <dt className="text-sm font-medium text-slate-500">Última actualización</dt>
              <dd className="mt-1 text-sm font-semibold text-slate-950">
                {new Intl.DateTimeFormat("es-BO").format(regulation.updatedAt)}
              </dd>
            </div>
          </dl>
        </header>

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-6">
            <h2 className="text-lg font-bold text-slate-950">
              Estructura de Requisitos
            </h2>
            <p className="text-sm text-slate-600">
              Listado de artículos, incisos o cláusulas exigidas por la normativa.
            </p>
          </div>
          
          <div className="p-6">
            <RequirementList 
              requirements={requirements} 
              canUpdate={canUpdate} 
            />
          </div>
        </section>
      </div>
    );
  } catch (error: unknown) {
    if (error && typeof error === "object" && "statusCode" in error && error.statusCode === 404) notFound();
    throw error;
  }
}
