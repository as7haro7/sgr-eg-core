"use client";

import {
  KeyRound,
  Menu,
  PanelLeftClose,
  ShieldCheck,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { GlobalActivityIndicator } from "@/components/ui/global-activity-indicator";
import { cn } from "@/lib/utils";
import { LogoutButton } from "@/modules/auth/components/logout-button";
import type { AuthPrincipal } from "@/modules/auth/types/auth.types";
import {
  navigationIcons,
  type NavigationItem,
} from "@/config/navigation";

interface AppShellProps {
  children: React.ReactNode;
  navigation: NavigationItem[];
  principal: AuthPrincipal;
  unreadAlertsCount?: number;
}

function isCurrentPath(pathname: string, href: string): boolean {
  return href === "/" ? pathname === href : pathname.startsWith(href);
}

function Navigation({
  items,
  pathname,
  onNavigate,
  collapsed = false,
  unreadAlertsCount,
}: {
  items: NavigationItem[];
  pathname: string;
  onNavigate?: () => void;
  collapsed?: boolean;
  unreadAlertsCount?: number;
}) {
  const activeHref = items
    .filter((item) => isCurrentPath(pathname, item.href))
    .sort((left, right) => right.href.length - left.href.length)[0]?.href;

  return (
    <nav aria-label="Navegación principal" className="flex-1 px-3 py-5">
      <ul className="space-y-1">
        {items.map((item) => {
          const active = activeHref === item.href;
          const Icon = navigationIcons[item.icon];

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                title={collapsed ? item.label : undefined}
                className={cn(
                  "flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  collapsed && "justify-center gap-0 px-0",
                  active
                    ? "bg-blue-50 text-blue-800"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
                )}
              >
                <Icon aria-hidden="true" className="size-5 shrink-0" />
                <span className={collapsed ? "sr-only" : "flex-1"}>
                  {item.label}
                </span>
                {!collapsed && item.href === "/alerts" && unreadAlertsCount !== undefined && unreadAlertsCount > 0 && (
                  <span className="flex h-5 items-center justify-center rounded-full bg-red-600 px-2 text-[10px] font-bold text-white">
                    {unreadAlertsCount > 99 ? "+99" : unreadAlertsCount}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function AppShell({
  children,
  navigation,
  principal,
  unreadAlertsCount,
}: AppShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);
  const mobileCloseButtonRef = useRef<HTMLButtonElement>(null);
  const mobilePanelRef = useRef<HTMLElement>(null);
  const mobileWasOpen = useRef(false);
  const navigationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const beginNavigation = useCallback(() => {
    setIsNavigating(true);
    if (navigationTimerRef.current) {
      clearTimeout(navigationTimerRef.current);
    }
    navigationTimerRef.current = setTimeout(
      () => setIsNavigating(false),
      15_000,
    );
  }, []);

  useEffect(() => {
    setDesktopCollapsed(
      window.localStorage.getItem("sgr-eg-sidebar-collapsed") === "true",
    );
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setIsNavigating(false);
    if (navigationTimerRef.current) {
      clearTimeout(navigationTimerRef.current);
      navigationTimerRef.current = null;
    }
  }, [pathname]);

  useEffect(() => {
    const handleInternalLink = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }
      const anchor = (event.target as Element | null)?.closest(
        "a[href]",
      ) as HTMLAnchorElement | null;
      if (
        !anchor ||
        anchor.target === "_blank" ||
        anchor.hasAttribute("download")
      ) {
        return;
      }
      const destination = new URL(anchor.href, window.location.href);
      if (
        destination.origin !== window.location.origin ||
        destination.href === window.location.href ||
        (destination.pathname === window.location.pathname &&
          destination.search === window.location.search &&
          destination.hash)
      ) {
        return;
      }
      beginNavigation();
    };
    document.addEventListener("click", handleInternalLink);
    return () => {
      document.removeEventListener("click", handleInternalLink);
      if (navigationTimerRef.current) {
        clearTimeout(navigationTimerRef.current);
      }
    };
  }, [beginNavigation]);

  useEffect(() => {
    if (!mobileOpen) return;

    document.body.style.overflow = "hidden";
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileOpen(false);
        return;
      }
      if (event.key !== "Tab" || !mobilePanelRef.current) return;
      const focusable = mobilePanelRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [mobileOpen]);

  useEffect(() => {
    if (mobileOpen) {
      mobileWasOpen.current = true;
      mobileCloseButtonRef.current?.focus();
      return;
    }

    if (mobileWasOpen.current) {
      mobileWasOpen.current = false;
      mobileMenuButtonRef.current?.focus();
    }
  }, [mobileOpen]);

  const toggleDesktopSidebar = () => {
    setDesktopCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem(
        "sgr-eg-sidebar-collapsed",
        String(next),
      );
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <GlobalActivityIndicator navigating={isNavigating} />
      <a
        href="#contenido-principal"
        className="fixed top-2 left-2 z-50 -translate-y-20 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition-transform focus:translate-y-0"
      >
        Saltar al contenido
      </a>

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden border-r border-slate-200 bg-white transition-[width] lg:flex lg:flex-col",
          desktopCollapsed ? "w-20" : "w-64",
        )}
        aria-label="Barra lateral"
      >
        <div className="flex h-18 items-center gap-3 border-b border-slate-200 px-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-700 text-white">
            <ShieldCheck aria-hidden="true" className="size-6" />
          </div>
          {!desktopCollapsed && (
            <div className="min-w-0">
              <p className="font-bold text-slate-950">SGR-EG</p>
              <p className="truncate text-xs text-slate-500">
                Gestión de riesgos
              </p>
            </div>
          )}
        </div>

        <Navigation
          items={navigation}
          pathname={pathname}
          onNavigate={beginNavigation}
          collapsed={desktopCollapsed}
          unreadAlertsCount={unreadAlertsCount}
        />

        <button
          type="button"
          onClick={toggleDesktopSidebar}
          className="m-3 flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-950"
          aria-label={
            desktopCollapsed ? "Expandir menú lateral" : "Contraer menú lateral"
          }
          aria-expanded={!desktopCollapsed}
          title={desktopCollapsed ? "Expandir menú lateral" : undefined}
        >
          <PanelLeftClose
            aria-hidden="true"
            className={cn(
              "size-5 transition-transform",
              desktopCollapsed && "rotate-180",
            )}
          />
          {!desktopCollapsed && "Contraer menú"}
        </button>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/50"
            aria-label="Cerrar menú"
            onClick={() => setMobileOpen(false)}
          />
          <aside
            ref={mobilePanelRef}
            className="relative flex h-full w-[min(20rem,88vw)] flex-col bg-white shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-label="Menú principal"
          >
            <div className="flex h-18 items-center justify-between border-b border-slate-200 px-4">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-blue-700 text-white">
                  <ShieldCheck aria-hidden="true" className="size-6" />
                </div>
                <div>
                  <p className="font-bold text-slate-950">SGR-EG</p>
                  <p className="text-xs text-slate-500">Gestión de riesgos</p>
                </div>
              </div>
              <button
                ref={mobileCloseButtonRef}
                type="button"
                onClick={() => setMobileOpen(false)}
                className="flex size-11 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"
                aria-label="Cerrar menú"
              >
                <X aria-hidden="true" className="size-5" />
              </button>
            </div>
            <Navigation
              items={navigation}
              pathname={pathname}
              onNavigate={() => {
                setMobileOpen(false);
                beginNavigation();
              }}
              unreadAlertsCount={unreadAlertsCount}
            />
          </aside>
        </div>
      )}

      <div
        className={cn(
          "transition-[padding] lg:pl-64",
          desktopCollapsed && "lg:pl-20",
        )}
      >
        <header className="sticky top-0 z-20 flex min-h-18 items-center justify-between gap-4 border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              ref={mobileMenuButtonRef}
              type="button"
              onClick={() => setMobileOpen(true)}
              className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 lg:hidden"
              aria-label="Abrir menú"
              aria-expanded={mobileOpen}
            >
              <Menu aria-hidden="true" className="size-5" />
            </button>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-950">
                {principal.name}
              </p>
              <p className="truncate text-xs text-slate-500">
                {principal.email}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/change-password"
              className="flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-950"
            >
              <KeyRound aria-hidden="true" className="size-4" />
              <span className="hidden sm:inline">Contraseña</span>
            </Link>
            <LogoutButton />
          </div>
        </header>

        <main
          id="contenido-principal"
          className="mx-auto w-full max-w-[100rem] p-4 sm:p-6 lg:p-8"
          tabIndex={-1}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
