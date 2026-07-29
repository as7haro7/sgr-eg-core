import { ArrowLeft, History, ShieldAlert } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { AuditLogDetails } from "@/modules/audit-log/components/audit-log-details";
import { getApplicationPrincipal } from "@/modules/auth/services/current-principal.service";
import { AuditLogService } from "@/modules/audit-log/services/audit-log.service";
import {
  auditActionLabel,
  auditEntityLabel,
} from "@/modules/audit-log/utils/audit-log-display";
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
    startDate: first(raw.startDate) || undefined,
    endDate: first(raw.endDate) || undefined,
    search: first(raw.search) || undefined,
  });

  const logs = await auditLogService.list(query, principal);
  const firstVisible =
    logs.total === 0 ? 0 : (logs.page - 1) * logs.pageSize + 1;
  const lastVisible = Math.min(logs.page * logs.pageSize, logs.total);

  return (
    <div className="w-full">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <header className="border-b border-slate-200 p-6 dark:border-slate-800">
          <Link
            href="/"
            className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Volver al inicio
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

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-950">
          <p>
            <span className="font-bold">Alcance de consulta:</span>{" "}
            {scopeLabel(logs.viewScope)}
          </p>
          <p className="font-semibold">
            {logs.total} {logs.total === 1 ? "registro encontrado" : "registros encontrados"}
          </p>
        </div>

        <form
          className="grid gap-3 border-b border-slate-200 p-4 sm:grid-cols-2 lg:grid-cols-4"
          method="get"
        >
          <input
            name="search"
            defaultValue={first(raw.search) ?? ""}
            aria-label="Buscar en la bitácora"
            className="form-input"
            placeholder="Acción, entidad, usuario o ID"
          />
          <select
            name="action"
            defaultValue={query.action ?? ""}
            aria-label="Filtrar bitácora por acción"
            className="form-input"
          >
            <option value="">Todas las acciones</option>
            <option value="insert">Creación automática</option>
            <option value="crear">Creación funcional</option>
            <option value="update">Modificación automática</option>
            <option value="actualizar">Modificación funcional</option>
            <option value="delete">Eliminación automática</option>
            <option value="desactivar">Desactivación</option>
            <option value="bootstrap">Inicialización del sistema</option>
            <option value="login">Inicio de sesión</option>
            <option value="logout">Cierre de sesión</option>
            <option value="cambiar_password">Cambio de contraseña</option>
            <option value="reset_password">Restablecimiento de contraseña</option>
            <option value="configurar_acceso">Configuración de acceso</option>
          </select>
          <input
            name="userId"
            defaultValue={first(raw.userId) ?? ""}
            aria-label="Filtrar por identificador de usuario"
            className="form-input"
            placeholder="ID del usuario"
          />
          <label className="grid gap-1 text-sm text-slate-700">
            Desde
            <input
              name="startDate"
              type="date"
              defaultValue={first(raw.startDate) ?? ""}
              className="form-input"
            />
          </label>
          <label className="grid gap-1 text-sm text-slate-700">
            Hasta
            <input
              name="endDate"
              type="date"
              defaultValue={first(raw.endDate) ?? ""}
              className="form-input"
            />
          </label>
          
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
            <option value="alertas">Alertas</option>
            <option value="apetitos_riesgo">Apetitos de riesgo</option>
            <option value="auditorias">Auditorías</option>
            <option value="categorias_riesgo">Categorías de riesgo</option>
            <option value="evidencias">Evidencias</option>
            <option value="hallazgos">Hallazgos</option>
            <option value="normativas">Normativas</option>
            <option value="paises">Países</option>
            <option value="parametros_sistema">Parámetros del sistema</option>
            <option value="requisitos">Requisitos</option>
            <option value="evaluaciones_cumplimiento">Evaluaciones</option>
            <option value="usuarios">Usuarios</option>
            <option value="roles">Roles</option>
            <option value="sesiones">Sesiones</option>
            <option value="unidades_negocio">Unidades de negocio</option>
          </select>

          <label className="grid gap-1 text-sm text-slate-700">
            Registros por página
            <select
              name="pageSize"
              defaultValue={String(query.pageSize)}
              className="form-input"
            >
              <option value="20">20 registros</option>
              <option value="50">50 registros</option>
              <option value="100">100 registros</option>
            </select>
          </label>
          
          <div className="flex items-end gap-2">
            <button
              type="submit"
              className="min-h-11 rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white hover:bg-blue-800"
            >
              Aplicar filtros
            </button>
            <Link
              href="/settings/audit-log"
              className="inline-flex min-h-11 items-center rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Limpiar
            </Link>
          </div>
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
                      timeZone: "America/La_Paz"
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
                          : ["insert", "crear"].includes(log.action)
                            ? "success"
                            : "neutral"
                      }
                    >
                      {auditActionLabel(log.action)}
                    </StatusBadge>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-medium text-slate-800">
                      {auditEntityLabel(log.entity)}
                    </p>
                    {log.entityId && (
                      <div className="mt-1 font-mono text-xs text-slate-400">
                        ID: {log.entityId}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <AuditLogDetails details={log.details} />
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

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 p-4">
          <div className="text-sm text-slate-600">
            <p>
              Mostrando {firstVisible}–{lastVisible} de {logs.total} registros
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Página {logs.page} de {Math.max(logs.totalPages, 1)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {logs.page > 1 && (
              <PageLink page={1} raw={raw}>
                Primera
              </PageLink>
            )}
            {logs.page > 1 && (
              <PageLink page={logs.page - 1} raw={raw}>
                Anterior
              </PageLink>
            )}
            {logs.page < logs.totalPages && (
              <PageLink page={logs.page + 1} raw={raw}>
                Siguiente
              </PageLink>
            )}
            {logs.page < logs.totalPages && (
              <PageLink page={logs.totalPages} raw={raw}>
                Última
              </PageLink>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function PageLink({
  children,
  page,
  raw,
}: {
  children: React.ReactNode;
  page: number;
  raw: Record<string, string | string[] | undefined>;
}) {
  return (
    <Link
      href={{
        pathname: "/settings/audit-log",
        query: { ...raw, page },
      }}
      className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
    >
      {children}
    </Link>
  );
}

function scopeLabel(
  scope: "asignado" | "combinado" | "global" | "propio" | "unidad",
): string {
  const labels = {
    global: "Global, sin restricción por unidad",
    unidad: "Registros vinculados a tus unidades",
    asignado: "Registros de elementos asignados a tu usuario",
    propio: "Eventos realizados por tu usuario",
    combinado: "Combinación de tus unidades, asignaciones y actividad propia",
  };
  return labels[scope];
}
