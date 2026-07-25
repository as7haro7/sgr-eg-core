import { AlertTriangle, CheckCircle2, Clock, Inbox } from "lucide-react";
import type { Metadata } from "next";

import { StatusBadge } from "@/components/ui/status-badge";
import { getApplicationPrincipal } from "@/modules/auth/services/current-principal.service";
import { AlertService } from "@/modules/alerts/services/alert.service";
import { listAlertsQuerySchema } from "@/modules/alerts/validators/alert.validator";
import { AlertAttendModal } from "@/modules/alerts/components/alert-attend-modal";
import { AlertReopenModal } from "@/modules/alerts/components/alert-reopen-modal";
import { parsePageQuery } from "@/modules/shared/validators/query.validator";

export const metadata: Metadata = {
  title: "Alertas | SGR-EG",
};
export const dynamic = "force-dynamic";

const alertService = new AlertService();

interface AlertsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AlertsPage({ searchParams }: AlertsPageProps) {
  const principal = await getApplicationPrincipal();
  const raw = await searchParams;
  
  const query = parsePageQuery(listAlertsQuerySchema, {
    page: first(raw.page),
    pageSize: first(raw.pageSize),
    status: first(raw.status) || undefined,
    severity: first(raw.severity) || undefined,
  });

  const alerts = await alertService.list(query, principal);

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <header className="border-b border-slate-200 p-6">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
            <Inbox aria-hidden="true" className="size-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-950">
              Bandeja de Alertas
            </h1>
            <p className="text-sm text-slate-600">
              Tienes {alerts.unreadCount} alerta{alerts.unreadCount === 1 ? "" : "s"} pendiente{alerts.unreadCount === 1 ? "" : "s"}
            </p>
          </div>
        </div>
      </header>

      <form
        className="grid gap-3 border-b border-slate-200 p-4 sm:grid-cols-2 lg:grid-cols-4"
        method="get"
      >
        <select
          name="status"
          defaultValue={query.status ?? ""}
          className="form-input"
        >
          <option value="">Todos los estados</option>
          <option value="pendiente">Pendiente</option>
          <option value="atendida">Atendida</option>
          <option value="descartada">Descartada</option>
        </select>
        
        <select
          name="severity"
          defaultValue={query.severity ?? ""}
          className="form-input"
        >
          <option value="">Cualquier severidad</option>
          <option value="media">Media</option>
          <option value="alta">Alta</option>
          <option value="critica">Crítica</option>
        </select>
        
        <button
          type="submit"
          className="min-h-11 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-slate-800"
        >
          Filtrar
        </button>
      </form>

      <div className="divide-y divide-slate-200">
        {alerts.items.map((alert) => (
          <article
            key={alert.id}
            className={`p-6 transition hover:bg-slate-50 ${
              alert.status === "pendiente" ? "bg-orange-50/30" : ""
            }`}
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex gap-4">
                <div className="mt-1">
                  {alert.status === "atendida" ? (
                    <CheckCircle2 className="size-6 text-green-500" />
                  ) : alert.severity === "critica" ? (
                    <AlertTriangle className="size-6 text-red-500" />
                  ) : (
                    <Clock className="size-6 text-orange-500" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-950">
                      Regla {alert.ruleCode}
                    </span>
                    <StatusBadge
                      tone={
                        alert.severity === "critica"
                          ? "danger"
                          : alert.severity === "alta"
                            ? "warning"
                            : "neutral"
                      }
                    >
                      {alert.severity}
                    </StatusBadge>
                    <StatusBadge
                      tone={
                        alert.status === "atendida"
                          ? "success"
                          : alert.status === "pendiente"
                            ? "warning"
                            : "neutral"
                      }
                    >
                      {alert.status}
                    </StatusBadge>
                  </div>
                  <p className="mt-1 text-slate-600">{alert.message}</p>
                  
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500">
                    <span>
                      Generada el {new Intl.DateTimeFormat("es-BO", { dateStyle: "long", timeStyle: "short" }).format(alert.generatedAt)}
                    </span>
                    {alert.attendedAt && (
                      <span>
                        Atendida el {new Intl.DateTimeFormat("es-BO", { dateStyle: "long", timeStyle: "short" }).format(alert.attendedAt)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex shrink-0 gap-2">
                {alert.status === "pendiente" ? (
                  <AlertAttendModal alertId={alert.id} />
                ) : (
                  <AlertReopenModal alertId={alert.id} />
                )}
              </div>
            </div>
          </article>
        ))}

        {alerts.items.length === 0 && (
          <div className="p-12 text-center">
            <Inbox className="mx-auto size-12 text-slate-300" />
            <h3 className="mt-4 font-medium text-slate-950">No hay alertas</h3>
            <p className="mt-1 text-sm text-slate-500">
              No se encontraron alertas que coincidan con los filtros.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
