import {
  BellRing,
  BookCheck,
  Building2,
  ClipboardCheck,
  FileClock,
  ListChecks,
  Settings2,
  ShieldAlert,
  UsersRound,
} from "lucide-react";
import Link from "next/link";

import type { AuthPrincipal } from "@/modules/auth/types/auth.types";

const roleLabels: Record<string, string> = {
  administrador: "Administración",
  analista_riesgos: "Análisis de riesgos",
  propietario_riesgo: "Propietario de riesgo",
  auditor_interno: "Auditoría interna",
  responsable_cumplimiento: "Cumplimiento",
  gerencia: "Gerencia",
  equipo_tecnico: "Equipo técnico",
};

function can(
  principal: AuthPrincipal,
  module: string,
  action: "read" | "create" | "update" | "manage",
) {
  return principal.permissions.some((permission) => {
    if (permission.module !== module) return false;
    if (action === "read") return permission.canRead;
    if (action === "create") return permission.canCreate;
    if (action === "update") return permission.canUpdate;
    return (
      permission.canCreate ||
      permission.canUpdate ||
      permission.canDeactivate
    );
  });
}

export function DashboardWorkspace({
  principal,
}: {
  principal: AuthPrincipal;
}) {
  const isManagement = principal.roleNames.includes("gerencia");
  const actions = [
    can(principal, "riesgos", "create") && {
      href: "/risks/new",
      label: "Registrar riesgo",
      description: "Identifica y valora un nuevo riesgo.",
      icon: ShieldAlert,
    },
    can(principal, "riesgos", "update") && {
      href: "/risks",
      label: "Gestionar riesgos",
      description: "Continúa evaluaciones, controles y tratamientos.",
      icon: ListChecks,
    },
    isManagement && {
      href: "/risks?status=abierto",
      label: "Decidir sobre riesgos",
      description: "Revisa riesgos abiertos que pueden requerir aceptación.",
      icon: ShieldAlert,
    },
    can(principal, "auditorias", "create") && {
      href: "/audits/new",
      label: "Planificar auditoría",
      description: "Define alcance, equipo y calendario.",
      icon: ClipboardCheck,
    },
    can(principal, "cumplimiento", "create") && {
      href: "/compliance/evaluations/new",
      label: "Nueva evaluación",
      description: "Evalúa un requisito para una unidad y periodo.",
      icon: BookCheck,
    },
    can(principal, "cumplimiento", "update") && {
      href: "/compliance/regulations",
      label: "Normativas",
      description: "Mantén requisitos, versiones y vigencias.",
      icon: FileClock,
    },
    can(principal, "alertas", "read") && {
      href: "/alerts?status=pendiente",
      label: "Alertas pendientes",
      description: "Consulta las situaciones que requieren atención.",
      icon: BellRing,
    },
    can(principal, "usuarios", "manage") && {
      href: "/users",
      label: "Usuarios y roles",
      description: "Administra accesos, roles y unidades.",
      icon: UsersRound,
    },
    can(principal, "organizacion", "manage") && {
      href: "/organization",
      label: "Organización",
      description: "Gestiona países y unidades de negocio.",
      icon: Building2,
    },
    can(principal, "organizacion", "manage") && {
      href: "/settings",
      label: "Configuración",
      description: "Ajusta catálogos, apetitos y parámetros.",
      icon: Settings2,
    },
  ].filter((action): action is Exclude<typeof action, false> => Boolean(action));
  const scopes = Array.from(
    new Set(
      principal.permissions
        .filter(({ canRead }) => canRead)
        .map(({ scope }) => scope),
    ),
  );

  return (
    <section className="surface-card overflow-hidden">
      <div className="border-b border-slate-200 bg-slate-50 px-5 py-4 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold tracking-wide text-blue-700 uppercase">
              Espacio de trabajo
            </p>
            <h2 className="mt-1 text-xl font-bold text-slate-950">
              Acciones disponibles para tu rol
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Solo se muestran operaciones que tus permisos permiten realizar.
            </p>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            {principal.roleNames.map((role) => (
              <span
                key={role}
                className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800"
              >
                {roleLabels[role] ?? role.replaceAll("_", " ")}
              </span>
            ))}
            {scopes.map((scope) => (
              <span
                key={scope}
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600"
              >
                Alcance: {scope}
              </span>
            ))}
          </div>
        </div>
      </div>

      {actions.length > 0 ? (
        <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3 sm:p-6">
          {actions.map(({ description, href, icon: Icon, label }) => (
            <Link
              key={`${href}-${label}`}
              href={href}
              className="group flex min-h-28 items-start gap-4 rounded-xl border border-slate-200 p-4 transition hover:-translate-y-0.5 hover:border-blue-300 hover:bg-blue-50/50 hover:shadow-sm"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-800 transition group-hover:bg-blue-700 group-hover:text-white">
                <Icon aria-hidden="true" className="size-5" />
              </span>
              <span>
                <span className="block font-bold text-slate-950">{label}</span>
                <span className="mt-1 block text-sm leading-5 text-slate-600">
                  {description}
                </span>
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <p className="p-6 text-sm text-slate-600">
          Tu perfil es de consulta. Utiliza el menú para revisar la información
          autorizada.
        </p>
      )}
    </section>
  );
}
