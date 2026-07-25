import type { LucideIcon } from "lucide-react";
import {
  Building2,
  Gauge,
  Settings2,
  ShieldAlert,
  UsersRound,
} from "lucide-react";

import type { AuthPrincipal } from "@/modules/auth/types/auth.types";

export interface NavigationItem {
  label: string;
  href: string;
  icon: LucideIcon;
  module?: string;
}

export const navigationItems: readonly NavigationItem[] = [
  {
    label: "Inicio",
    href: "/",
    icon: Gauge,
  },
  {
    label: "Riesgos",
    href: "/risks",
    icon: ShieldAlert,
    module: "riesgos",
  },
  {
    label: "Usuarios",
    href: "/users",
    icon: UsersRound,
    module: "usuarios",
  },
  {
    label: "Organización",
    href: "/organization",
    icon: Building2,
    module: "organizacion",
  },
  {
    label: "Configuración",
    href: "/settings",
    icon: Settings2,
    module: "organizacion",
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
