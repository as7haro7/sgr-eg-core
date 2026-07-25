import { ArrowLeft, ClipboardPlus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { AuthorizationService } from "@/modules/auth/services/authorization.service";
import { getApplicationPrincipal } from "@/modules/auth/services/current-principal.service";
import { AuditForm } from "@/modules/audits/components/audit-form";
import { AuditService } from "@/modules/audits/services/audit.service";
import { BusinessUnitService } from "@/modules/business-units/services/business-unit.service";

export const metadata: Metadata = {
  title: "Planificar auditoría | SGR-EG",
};
export const dynamic = "force-dynamic";

const auditService = new AuditService();
const authorizationService = new AuthorizationService();
const businessUnitService = new BusinessUnitService();

export default async function NewAuditPage() {
  const principal = await getApplicationPrincipal();
  const permissions = principal.permissions.filter(
    ({ module, canCreate }) => module === "auditorias" && canCreate,
  );
  const canCreate = permissions.length > 0;

  if (!canCreate) {
    authorizationService.assertAllowed(principal, "auditorias", "create");
  }

  const [allUnits, users] = await Promise.all([
    businessUnitService.listActive(),
    auditService.listUserOptions(),
  ]);
  const onlyUnitScope = permissions.every(({ scope }) => scope === "unidad");
  const units = onlyUnitScope
    ? allUnits.filter(({ id }) => principal.unitIds.includes(id))
    : allUnits;

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <header className="border-b border-slate-200 p-6">
        <Link
          href="/audits"
          className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-blue-700"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Volver al listado
        </Link>
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-blue-700 text-white">
            <ClipboardPlus aria-hidden="true" className="size-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-950">
              Planificar auditoría
            </h1>
            <p className="text-sm text-slate-600">
              Define alcance, periodo, responsable y equipo auditor.
            </p>
          </div>
        </div>
      </header>
      <AuditForm
        currentUserId={principal.userId}
        units={units}
        users={users}
      />
    </section>
  );
}
