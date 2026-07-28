import {
  BookCheck,
  Building2,
  ClipboardCheck,
  Gauge,
  Settings2,
  ShieldAlert,
  UsersRound,
  Inbox,
} from "lucide-react";

import type { AuthPrincipal } from "@/modules/auth/types/auth.types";

export type NavigationIcon =
  | "home"
  | "audits"
  | "compliance"
  | "risks"
  | "users"
  | "organization"
  | "settings"
  | "alerts";

export const navigationIcons = {
  home: Gauge,
  audits: ClipboardCheck,
  compliance: BookCheck,
  risks: ShieldAlert,
  users: UsersRound,
  organization: Building2,
  settings: Settings2,
  alerts: Inbox,
} as const;

export interface NavigationItem {
  label: string;
  href: string;
  icon: NavigationIcon;
  module?: string;
  visibility?: "read" | "manage";
}

export const navigationItems: readonly NavigationItem[] = [
  {
    label: "Inicio",
    href: "/",
    icon: "home",
    module: "reportes",
  },
  {
    label: "Riesgos",
    href: "/risks",
    icon: "risks",
    module: "riesgos",
  },
  {
    label: "Auditorías",
    href: "/audits",
    icon: "audits",
    module: "auditorias",
  },
  {
    label: "Cumplimiento",
    href: "/compliance",
    icon: "compliance",
    module: "cumplimiento",
  },
  {
    label: "Usuarios y roles",
    href: "/users",
    icon: "users",
    module: "usuarios",
    visibility: "manage",
  },
  {
    label: "Organización",
    href: "/organization",
    icon: "organization",
    module: "organizacion",
    visibility: "manage",
  },
  {
    label: "Configuración",
    href: "/settings",
    icon: "settings",
    module: "organizacion",
    visibility: "manage",
  },
  {
    label: "Bitácora",
    href: "/settings/audit-log",
    icon: "settings",
    module: "bitacora",
  },
  {
    label: "Alertas",
    href: "/alerts",
    icon: "alerts",
    module: "alertas",
  },
] as const;

export function canReadModule(
  principal: AuthPrincipal,
  module: string,
): boolean {
  return principal.permissions.some(
    (permission) => permission.module === module && permission.canRead,
  );
}

export function getVisibleNavigation(
  principal: AuthPrincipal,
): NavigationItem[] {
  return navigationItems.filter(
    (item) => {
      if (!item.module) return true;
      if (item.visibility !== "manage") {
        return canReadModule(principal, item.module);
      }

      return principal.permissions.some(
        (permission) =>
          permission.module === item.module &&
          (permission.canCreate ||
            permission.canUpdate ||
            permission.canDeactivate),
      );
    },
  );
}
