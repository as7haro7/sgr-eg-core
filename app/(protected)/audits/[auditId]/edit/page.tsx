import { ArrowLeft, Pencil } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { notFoundOnMissing } from "@/lib/page-error";
import { getApplicationPrincipal } from "@/modules/auth/services/current-principal.service";
import { AuditForm } from "@/modules/audits/components/audit-form";
import { AuditService } from "@/modules/audits/services/audit.service";
import { auditIdSchema } from "@/modules/audits/validators/audit.validator";
import { BusinessUnitService } from "@/modules/business-units/services/business-unit.service";

export const metadata: Metadata = {
  title: "Editar auditoría | SGR-EG",
};
export const dynamic = "force-dynamic";

const auditService = new AuditService();
const businessUnitService = new BusinessUnitService();

export default async function EditAuditPage({
  params,
}: {
  params: Promise<{ auditId: string }>;
}) {
  const principal = await getApplicationPrincipal();
  const parsed = auditIdSchema.safeParse((await params).auditId);
  if (!parsed.success) notFound();
  const audit = await notFoundOnMissing(
    auditService.getById(parsed.data, principal),
  );
  await auditService.listAvailableTransitions(audit.id, principal);
  const [allUnits, users] = await Promise.all([
    businessUnitService.listActive(),
    auditService.listUserOptions(),
  ]);
  const hasGlobal = principal.permissions.some(
    ({ module, canUpdate, scope }) =>
      module === "auditorias" && canUpdate && scope === "global",
  );
  const units = hasGlobal
    ? allUnits
    : allUnits.filter(({ id }) => principal.unitIds.includes(id));

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <header className="border-b border-slate-200 p-6">
        <Link
          href={`/audits/${audit.id}`}
          className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-blue-700"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Volver al detalle
        </Link>
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-blue-700 text-white">
            <Pencil aria-hidden="true" className="size-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-950">
              Editar auditoría
            </h1>
            <p className="text-sm text-slate-600">
              Actualiza alcance, fechas, responsable y equipo.
            </p>
          </div>
        </div>
      </header>
      <AuditForm
        audit={audit}
        currentUserId={principal.userId}
        units={units}
        users={users}
      />
    </section>
  );
}
