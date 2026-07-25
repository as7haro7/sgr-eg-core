import { BookCheck } from "lucide-react";
import type { ReactNode } from "react";

import { ComplianceNav } from "@/modules/compliance/components/compliance-nav";

export default function ComplianceLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <header className="border-b border-slate-200 p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-xl bg-blue-700 text-white">
                <BookCheck aria-hidden="true" className="size-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-950">
                  Cumplimiento Normativo
                </h1>
                <p className="text-sm text-slate-600">
                  Gestión de normativas y evaluaciones de cumplimiento
                </p>
              </div>
            </div>
          </div>
        </header>
        
        <ComplianceNav />
      </section>

      {/* El contenido de las sub-rutas se renderizará aquí */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {children}
      </section>
    </div>
  );
}
