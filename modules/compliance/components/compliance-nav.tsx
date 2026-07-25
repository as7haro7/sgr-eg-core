"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function ComplianceNav() {
  const pathname = usePathname();

  const tabs = [
    { label: "Evaluaciones", href: "/compliance" },
    { label: "Normativas", href: "/compliance/regulations" },
  ];

  return (
    <nav className="border-b border-slate-200 px-4" aria-label="Navegación de cumplimiento">
      <div className="flex min-w-max gap-1">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={isActive ? "page" : undefined}
              className={
                isActive
                  ? "border-b-2 border-blue-700 px-4 py-3 text-sm font-semibold text-blue-700"
                  : "border-b-2 border-transparent px-4 py-3 text-sm font-medium text-slate-600 hover:text-slate-950"
              }
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
