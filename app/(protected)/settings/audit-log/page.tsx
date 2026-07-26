import { ArrowLeft, History, ShieldAlert } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { getApplicationPrincipal } from "@/modules/auth/services/current-principal.service";
import { AuditLogService } from "@/modules/audit-log/services/audit-log.service";
import { listAuditLogQuerySchema } from "@/modules/audit-log/validators/audit-log.validator";
import { StatusBadge } from "@/components/ui/status-badge";
import { parsePageQuery } from "@/modules/shared/validators/query.validator";

export const metadata: Metadata = {
  title: "Bitácora | SGR-EG",
};
export const dynamic = "force-dynamic";

const auditLogService = new AuditLogService();

interface AuditLogPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AuditLogPage({ searchParams }: AuditLogPageProps) {
  const principal = await getApplicationPrincipal();
  const raw = await searchParams;
  
  const query = parsePageQuery(listAuditLogQuerySchema, {
    page: first(raw.page),
    pageSize: first(raw.pageSize),
    action: first(raw.action) || undefined,
    entity: first(raw.entity) || undefined,
    userId: first(raw.userId) || undefined,
  });

  const logs = await auditLogService.list(query, principal);

  return (
    <div className="w-full">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <header className="border-b border-slate-200 p-6 dark:border-slate-800">
          <Link
            href="/settings?tab=audit-log"
            className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Volver a configuración
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-slate-950 text-white dark:bg-white dark:text-slate-950">
              <History aria-hidden="true" className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-950 dark:text-white">
                Bitácora de Auditoría
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Registro inmutable de actividades en el sistema
              </p>
            </div>
          </div>
        </header>

        <form
          className="grid gap-3 border-b border-slate-200 p-4 sm:grid-cols-2 lg:grid-cols-4"
          method="get"
        >
          <select
            name="action"
            defaultValue={query.action ?? ""}
            aria-label="Filtrar bitácora por acción"
            className="form-input"
          >
            <option value="">Todas las acciones</option>
            <option value="create">Creación automática</option>
            <option value="crear">Creación funcional</option>
            <option value="update">Modificación automática</option>
            <option value="actualizar">Modificación funcional</option>
            <option value="delete">Eliminación automática</option>
            <option value="desactivar">Desactivación</option>
            <option value="login">Inicio de sesión</option>
            <option value="logout">Cierre de sesión</option>
            <option value="cambiar_password">Cambio de contraseña</option>
            <option value="reset_password">Restablecimiento de contraseña</option>
            <option value="configurar_acceso">Configuración de acceso</option>
          </select>
          
          <select
            name="entity"
            defaultValue={query.entity ?? ""}
            aria-label="Filtrar bitácora por entidad"
            className="form-input"
          >
            <option value="">Cualquier entidad</option>
            <option value="riesgos">Riesgos</option>
            <option value="controles">Controles</option>
            <option value="planes_mitigacion">Planes de mitigación</option>
            <option value="acciones_mitigacion">Acciones de mitigación</option>
            <option value="auditorias">Auditorías</option>
            <option value="hallazgos">Hallazgos</option>
            <option value="normativas">Normativas</option>
            <option value="requisitos">Requisitos</option>
            <option value="evaluaciones_cumplimiento">Evaluaciones</option>
            <option value="usuarios">Usuarios</option>
            <option value="roles">Roles</option>
            <option value="sesiones">Sesiones</option>
          </select>
          
          <button
            type="submit"
            className="min-h-11 rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white hover:bg-blue-800"
          >
            Aplicar filtros
          </button>
        </form>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-6 py-3 font-semibold">Fecha y Hora</th>
                <th className="px-6 py-3 font-semibold">Usuario</th>
                <th className="px-6 py-3 font-semibold">Acción</th>
                <th className="px-6 py-3 font-semibold">Entidad</th>
                <th className="px-6 py-3 font-semibold">Detalles</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {logs.items.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50">
                  <td className="whitespace-nowrap px-6 py-4">
                    {new Intl.DateTimeFormat("es-BO", {
                      dateStyle: "medium",
                      timeStyle: "medium",
                      timeZone: "UTC"
                    }).format(log.timestamp)}
                  </td>
                  <td className="px-6 py-4">
                    {log.user ? (
                      <div>
                        <p className="font-medium text-slate-950">{log.user.name}</p>
                      </div>
                    ) : (
                      <span className="text-slate-400">Sistema</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge
                      tone={
                        log.action === "delete"
                          ? "danger"
                          : log.action === "create"
                            ? "success"
                            : "neutral"
                      }
                    >
                      {log.action}
                    </StatusBadge>
                  </td>
                  <td className="px-6 py-4 capitalize">
                    {log.entity}
                    <div className="text-xs text-slate-400 font-mono mt-1">ID: {log.entityId}</div>
                  </td>
                  <td className="px-6 py-4">
                    {log.details ? (
                      <details className="cursor-pointer">
                        <summary className="text-blue-700 hover:underline">Ver cambios</summary>
                        <pre className="mt-2 max-w-xs overflow-auto rounded bg-slate-100 p-2 text-xs text-slate-700">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      </details>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                </tr>
              ))}
              {logs.items.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <ShieldAlert className="mx-auto size-12 text-slate-300" />
                    <p className="mt-4 text-slate-500">
                      No se encontraron registros en la bitácora.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 p-4">
          <span className="text-sm text-slate-600">
            Mostrando {logs.items.length} de {logs.total} registros
          </span>
        </div>
      </section>
    </div>
  );
}
