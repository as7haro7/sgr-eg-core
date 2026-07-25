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
}

export const navigationItems: readonly NavigationItem[] = [
  {
    label: "Inicio",
    href: "/",
    icon: "home",
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
    label: "Usuarios",
    href: "/users",
    icon: "users",
    module: "usuarios",
  },
  {
    label: "Organización",
    href: "/organization",
    icon: "organization",
    module: "organizacion",
  },
  {
    label: "Configuración",
    href: "/settings",
    icon: "settings",
    module: "organizacion",
  },
  {
    label: "Alertas",
    href: "/alerts",
    icon: "alerts",
    // Siempre visible
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
    (item) => !item.module || canReadModule(principal, item.module),
  );
}
