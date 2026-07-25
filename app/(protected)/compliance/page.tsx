import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { StatusBadge } from "@/components/ui/status-badge";
import { getApplicationPrincipal } from "@/modules/auth/services/current-principal.service";
import {
  evaluationResultLabels,
  evaluationResults,
} from "@/modules/compliance/constants/evaluation";
import { EvaluationService } from "@/modules/compliance/services/evaluation.service";
import { listEvaluationsQuerySchema } from "@/modules/compliance/validators/evaluation.validator";

export const metadata: Metadata = {
  title: "Cumplimiento | SGR-EG",
};
export const dynamic = "force-dynamic";

const evaluationService = new EvaluationService();

interface CompliancePageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const resultTone = {
  conforme: "success",
  parcialmente_conforme: "warning",
  no_conforme: "danger",
  no_aplicable: "neutral",
} as const;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("es-BO", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(value);
}

export default async function CompliancePage({
  searchParams,
}: CompliancePageProps) {
  const principal = await getApplicationPrincipal();
  const raw = await searchParams;
  const query = listEvaluationsQuerySchema.parse({
    page: first(raw.page),
    pageSize: first(raw.pageSize),
    search: first(raw.search),
    result: first(raw.result) || undefined,
    unitId: first(raw.unitId) || undefined,
  });
  const [evaluations, units] = await Promise.all([
    evaluationService.list(query, principal),
    evaluationService.listUnitOptions(principal),
  ]);
  const canCreate = principal.permissions.some(
    ({ module, canCreate }) =>
      module === "cumplimiento" && canCreate,
  );

  return (
    <div className="w-full">
      <div className="flex items-center justify-between border-b border-slate-200 p-4">
        <p className="text-sm font-medium text-slate-600">
          {evaluations.total} evaluación{evaluations.total === 1 ? "" : "es"} encontrada{evaluations.total === 1 ? "" : "s"}
        </p>
        {canCreate && (
          <Link
            href="/compliance/evaluations/new"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white hover:bg-blue-800"
          >
            <Plus aria-hidden="true" className="size-4" />
            Nueva evaluación
          </Link>
        )}
      </div>

      <form
        className="grid gap-3 border-b border-slate-200 p-4 sm:grid-cols-2 lg:grid-cols-4"
        method="get"
      >
        <input
          name="search"
          defaultValue={query.search}
          placeholder="Normativa, código o descripción"
          aria-label="Buscar evaluaciones"
          className="form-input"
        />
        <select
          name="result"
          defaultValue={query.result ?? ""}
          aria-label="Filtrar por resultado"
          className="form-input"
        >
          <option value="">Todos los resultados</option>
          {evaluationResults.map((result) => (
            <option key={result} value={result}>
              {evaluationResultLabels[result]}
            </option>
          ))}
        </select>
        <select
          name="unitId"
          defaultValue={query.unitId ?? ""}
          aria-label="Filtrar por unidad"
          className="form-input"
        >
          <option value="">Todas las unidades</option>
          {units.map((unit) => (
            <option key={unit.id} value={unit.id}>
              {unit.name}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="min-h-11 rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white hover:bg-blue-800"
        >
          Aplicar filtros
        </button>
      </form>

      <ul className="divide-y divide-slate-200 md:hidden">
        {evaluations.items.map((evaluation) => (
          <li key={evaluation.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <Link
                href={`/compliance/evaluations/${evaluation.id}`}
                className="font-semibold text-slate-950 hover:text-blue-700"
              >
                {evaluation.requirement.code} ·{" "}
                {evaluation.requirement.regulation.name}
              </Link>
              <StatusBadge tone={resultTone[evaluation.result]}>
                {evaluationResultLabels[evaluation.result]}
              </StatusBadge>
            </div>
            <p className="mt-2 text-sm text-slate-600">
              {evaluation.unit.name}
            </p>
            <p className="mt-3 text-xs text-slate-500">
              {formatDate(evaluation.periodStart)} –{" "}
              {formatDate(evaluation.periodEnd)}
            </p>
          </li>
        ))}
      </ul>

      <div className="hidden overflow-x-auto md:block">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold tracking-wide text-slate-600 uppercase">
            <tr>
              <th className="px-6 py-3" scope="col">Requisito</th>
              <th className="px-6 py-3" scope="col">Unidad</th>
              <th className="px-6 py-3" scope="col">Periodo</th>
              <th className="px-6 py-3" scope="col">Resultado</th>
              <th className="px-6 py-3" scope="col">Evidencias</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {evaluations.items.map((evaluation) => (
              <tr key={evaluation.id} className="hover:bg-slate-50">
                <td className="px-6 py-4">
                  <Link
                    href={`/compliance/evaluations/${evaluation.id}`}
                    className="font-semibold text-slate-950 hover:text-blue-700 hover:underline"
                  >
                    {evaluation.requirement.code} v
                    {evaluation.requirement.version}
                  </Link>
                  <p className="mt-1 max-w-sm truncate text-slate-500">
                    {evaluation.requirement.regulation.name}
                  </p>
                </td>
                <td className="px-6 py-4 text-slate-600">
                  {evaluation.unit.name}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-slate-600">
                  {formatDate(evaluation.periodStart)} –{" "}
                  {formatDate(evaluation.periodEnd)}
                </td>
                <td className="px-6 py-4">
                  <StatusBadge tone={resultTone[evaluation.result]}>
                    {evaluationResultLabels[evaluation.result]}
                  </StatusBadge>
                </td>
                <td className="px-6 py-4 tabular-nums text-slate-600">
                  {evaluation.evidenceCount}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {evaluations.items.length === 0 && (
        <p className="p-8 text-center text-sm text-slate-500">
          No se encontraron evaluaciones para los filtros seleccionados.
        </p>
      )}
    </div>
  );
}
