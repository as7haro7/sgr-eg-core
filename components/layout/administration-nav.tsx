import { Building2, Settings2, UsersRound } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";
import type { AuthPrincipal } from "@/modules/auth/types/auth.types";

const sections = [
  {
    id: "users",
    href: "/users",
    label: "Usuarios y roles",
    description: "Accesos, permisos y unidades asignadas",
    module: "usuarios",
    icon: UsersRound,
  },
  {
    id: "organization",
    href: "/organization",
    label: "Organización",
    description: "Países y unidades de negocio",
    module: "organizacion",
    icon: Building2,
  },
  {
    id: "settings",
    href: "/settings",
    label: "Configuración",
    description: "Categorías, apetitos y parámetros",
    module: "organizacion",
    icon: Settings2,
  },
] as const;

export function AdministrationNav({
  active,
  principal,
}: {
  active: (typeof sections)[number]["id"];
  principal: AuthPrincipal;
}) {
  const visible = sections.filter(({ module }) =>
    principal.permissions.some(
      (permission) => permission.module === module && permission.canRead,
    ),
  );

  if (visible.length < 2) return null;

  return (
    <nav aria-label="Administración" className="mb-5">
      <p className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">
        Administración
      </p>
      <div className="grid gap-2 md:grid-cols-3">
        {visible.map((section) => {
          const Icon = section.icon;
          const selected = active === section.id;
          return (
            <Link
              key={section.id}
              href={section.href}
              aria-current={selected ? "page" : undefined}
              className={cn(
                "flex min-h-18 items-center gap-3 rounded-xl border p-3 transition",
                selected
                  ? "border-blue-300 bg-blue-50 text-blue-950 shadow-sm"
                  : "border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-slate-50",
              )}
            >
              <span
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-lg",
                  selected ? "bg-blue-700 text-white" : "bg-slate-100 text-slate-600",
                )}
              >
                <Icon aria-hidden="true" className="size-5" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold">{section.label}</span>
                <span className="mt-0.5 block text-xs leading-4 text-slate-500">
                  {section.description}
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
