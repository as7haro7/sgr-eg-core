import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { StatusBadge } from "@/components/ui/status-badge";
import { getApplicationPrincipal } from "@/modules/auth/services/current-principal.service";
import { RegulationService } from "@/modules/regulations/services/regulation.service";

export const metadata: Metadata = {
  title: "Normativas | SGR-EG",
};
export const dynamic = "force-dynamic";

const regulationService = new RegulationService();

export default async function RegulationsPage() {
  const principal = await getApplicationPrincipal();
  const result = await regulationService.listRegulations(
    { page: 1, pageSize: 100 },
    principal
  );
  const regulations = result.items;
  
  const canCreate = principal.permissions.some(
    ({ module, canCreate }) => module === "cumplimiento" && canCreate,
  );

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-950">Catálogo de Normativas</h2>
          <p className="text-sm text-slate-600">
            Gestiona el marco normativo y sus requisitos
          </p>
        </div>
        {canCreate && (
          <Link
            href="/compliance/regulations/new"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white hover:bg-blue-800"
          >
            <Plus aria-hidden="true" className="size-4" />
            Nueva normativa
          </Link>
        )}
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3 font-semibold">Versión</th>
              <th className="px-4 py-3 font-semibold">Nombre</th>
              <th className="px-4 py-3 font-semibold">Jurisdicción</th>
              <th className="px-4 py-3 font-semibold">Requisitos</th>
              <th className="px-4 py-3 font-semibold">Estado</th>
              <th className="px-4 py-3 font-semibold">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {regulations.map((reg) => (
              <tr key={reg.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-950">
                  {reg.version || "1.0"}
                </td>
                <td className="px-4 py-3">{reg.name}</td>
                <td className="px-4 py-3">{reg.jurisdiction}</td>
                <td className="px-4 py-3">{reg.requirementCount}</td>
                <td className="px-4 py-3">
                  <StatusBadge tone={reg.status === "vigente" ? "success" : "neutral"}>
                    {reg.status}
                  </StatusBadge>
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/compliance/regulations/${reg.id}`}
                    className="font-medium text-blue-700 hover:underline"
                  >
                    Ver detalles
                  </Link>
                </td>
              </tr>
            ))}
            {regulations.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  No hay normativas registradas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
