import { ClipboardCheck, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { StatusBadge } from "@/components/ui/status-badge";
import { getApplicationPrincipal } from "@/modules/auth/services/current-principal.service";
import {
  auditStatuses,
  auditStatusLabels,
} from "@/modules/audits/constants/audit";
import { AuditService } from "@/modules/audits/services/audit.service";
import { listAuditsQuerySchema } from "@/modules/audits/validators/audit.validator";
import { BusinessUnitService } from "@/modules/business-units/services/business-unit.service";
import { parsePageQuery } from "@/modules/shared/validators/query.validator";

export const metadata: Metadata = {
  title: "Auditorías | SGR-EG",
};

export const dynamic = "force-dynamic";

const auditService = new AuditService();
const businessUnitService = new BusinessUnitService();

interface AuditsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function formatDate(value: Date | null): string {
  if (!value) return "Sin fecha";

  return new Intl.DateTimeFormat("es-BO", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(value);
}

export default async function AuditsPage({
  searchParams,
}: AuditsPageProps) {
  const principal = await getApplicationPrincipal();
  const raw = await searchParams;
  const query = parsePageQuery(listAuditsQuerySchema, {
    page: first(raw.page),
    pageSize: first(raw.pageSize),
    search: first(raw.search),
    status: first(raw.status) || undefined,
    unitId: first(raw.unitId) || undefined,
  });
  const [audits, allUnits] = await Promise.all([
    auditService.list(query, principal),
    businessUnitService.listActive(),
  ]);
  const createPermissions = principal.permissions.filter(
    (permission) =>
      permission.module === "auditorias" && permission.canCreate,
  );
  const canCreate = createPermissions.length > 0;

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <header className="border-b border-slate-200 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-blue-700 text-white">
              <ClipboardCheck aria-hidden="true" className="size-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-950">Auditorías</h1>
              <p className="text-sm text-slate-600">
                {audits.total} auditoría{audits.total === 1 ? "" : "s"} dentro
                de tu alcance
              </p>
            </div>
          </div>
          {canCreate && (
            <Link
              href="/audits/new"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white hover:bg-blue-800"
            >
              <Plus aria-hidden="true" className="size-4" />
              Planificar auditoría
            </Link>
          )}
        </div>
      </header>

      <form
        className="grid gap-3 border-b border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4"
        method="get"
      >
        <input
          name="search"
          defaultValue={query.search}
          placeholder="Objetivo o alcance"
          aria-label="Buscar auditorías"
          className="form-input"
        />
        <select
          name="status"
          defaultValue={query.status ?? ""}
          aria-label="Filtrar por estado"
          className="form-input"
        >
          <option value="">Todos los estados</option>
          {auditStatuses.map((status) => (
            <option key={status} value={status}>
              {auditStatusLabels[status]}
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
          {allUnits.map((unit) => (
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
        {audits.items.map((audit) => (
          <li key={audit.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <Link
                href={`/audits/${audit.id}`}
                className="font-semibold text-slate-950 hover:text-blue-700"
              >
                {audit.objective}
              </Link>
              <StatusBadge
                tone={
                  audit.status === "cerrada"
                    ? "success"
                    : audit.status === "cancelada"
                      ? "danger"
                      : "info"
                }
              >
                {auditStatusLabels[audit.status]}
              </StatusBadge>
            </div>
            <p className="mt-2 text-sm text-slate-600">
              {audit.unit?.name ?? "Alcance corporativo"}
            </p>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-xs text-slate-500">Periodo</dt>
                <dd className="font-medium">
                  {formatDate(audit.startDate)} – {formatDate(audit.endDate)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Responsable</dt>
                <dd className="font-medium">{audit.responsible.name}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Hallazgos</dt>
                <dd className="font-bold tabular-nums">
                  {audit.findingCount}
                </dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>

      <div className="hidden overflow-x-auto md:block">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold tracking-wide text-slate-600 uppercase">
            <tr>
              <th className="px-6 py-3" scope="col">Auditoría</th>
              <th className="px-6 py-3" scope="col">Periodo</th>
              <th className="px-6 py-3" scope="col">Responsable</th>
              <th className="px-6 py-3" scope="col">Estado</th>
              <th className="px-6 py-3" scope="col">Hallazgos</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {audits.items.map((audit) => (
              <tr key={audit.id} className="hover:bg-slate-50">
                <td className="px-6 py-4">
                  <Link
                    href={`/audits/${audit.id}`}
                    className="font-semibold text-slate-950 hover:text-blue-700 hover:underline"
                  >
                    {audit.objective}
                  </Link>
                  <p className="mt-1 max-w-md truncate text-slate-500">
                    {audit.unit?.name ?? "Alcance corporativo"}
                  </p>
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-slate-600">
                  {formatDate(audit.startDate)} – {formatDate(audit.endDate)}
                </td>
                <td className="px-6 py-4 text-slate-600">
                  {audit.responsible.name}
                </td>
                <td className="px-6 py-4">
                  <StatusBadge tone={audit.status === "cerrada" ? "success" : audit.status === "cancelada" ? "danger" : "info"}>
                    {auditStatusLabels[audit.status]}
                  </StatusBadge>
                </td>
                <td className="px-6 py-4 tabular-nums text-slate-600">
                  {audit.findingCount}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {audits.items.length === 0 && (
        <p className="p-8 text-center text-sm text-slate-500">
          No se encontraron auditorías para los filtros seleccionados.
        </p>
      )}
    </section>
  );
}
