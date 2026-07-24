import { ArrowLeft, ShieldAlert } from "lucide-react";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { SESSION_COOKIE_NAME } from "@/modules/auth/constants/session-cookie";
import { AuthService } from "@/modules/auth/services/auth.service";
import { AuthorizationService } from "@/modules/auth/services/authorization.service";
import type { AuthPrincipal } from "@/modules/auth/types/auth.types";
import { BusinessUnitService } from "@/modules/business-units/services/business-unit.service";
import { RiskForm } from "@/modules/risks/components/risk-form";
import { RiskTransitionForm } from "@/modules/risks/components/risk-transition-form";
import { riskStatusLabels } from "@/modules/risks/constants/risk-status";
import { RiskConfigurationService } from "@/modules/risks/services/risk-configuration.service";
import { RiskService } from "@/modules/risks/services/risk.service";
import { riskIdSchema } from "@/modules/risks/validators/risk.validator";

export const metadata: Metadata = {
  title: "Detalle de riesgo | SGR-EG",
};

export const dynamic = "force-dynamic";

const authService = new AuthService();
const authorizationService = new AuthorizationService();
const businessUnitService = new BusinessUnitService();
const riskConfigurationService = new RiskConfigurationService();
const riskService = new RiskService();

interface RiskDetailPageProps {
  params: Promise<{ riskId: string }>;
}

export default async function RiskDetailPage({
  params,
}: RiskDetailPageProps) {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    redirect("/login");
  }

  let principal: AuthPrincipal;

  try {
    principal = await authService.authenticate(token);
  } catch {
    redirect("/login");
  }

  if (principal.mustChangePassword) {
    redirect("/change-password");
  }

  const riskId = riskIdSchema.parse((await params).riskId);
  const risk = await riskService.getById(riskId, principal);
  const canUpdate = authorizationService.isAllowed(
    principal,
    "riesgos",
    "update",
    {
      unitId: risk.unit.id,
      ownerId: risk.createdBy.id,
      assigneeIds: risk.owner ? [risk.owner.id] : [],
    },
  );
  const hasGlobalUpdate = principal.permissions.some(
    (permission) =>
      permission.module === "riesgos" &&
      permission.canUpdate &&
      permission.scope === "global",
  );
  const [categories, units, owners, transitions] = canUpdate
    ? await Promise.all([
        riskConfigurationService.listCategories(),
        businessUnitService.listActive(),
        riskService.listOwnerOptions(
          hasGlobalUpdate ? undefined : [risk.unit.id],
        ),
        riskService.listAvailableTransitions(riskId, principal),
      ])
    : [[], [], [], []];

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 dark:bg-slate-950">
      <section className="mx-auto max-w-7xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <header className="border-b border-slate-200 p-6 dark:border-slate-800">
          <Link
            href="/risks"
            className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white"
          >
            <ArrowLeft className="size-4" />
            Volver a riesgos
          </Link>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-slate-950 text-white dark:bg-white dark:text-slate-950">
                <ShieldAlert className="size-5" />
              </div>
              <div>
                <p className="font-mono text-sm text-slate-500">{risk.code}</p>
                <h1 className="text-2xl font-bold text-slate-950 dark:text-white">
                  {risk.title}
                </h1>
              </div>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1.5 text-sm font-semibold dark:bg-slate-800">
              {riskStatusLabels[risk.status]}
            </span>
          </div>
        </header>

        <div className="grid gap-6 p-6 md:grid-cols-2 xl:grid-cols-4">
          <Metric label="Nivel inherente" value={risk.inherentLevel} />
          <Metric label="Nivel residual" value={risk.residualLevel} />
          <Metric label="Probabilidad" value={risk.probability} />
          <Metric label="Impacto" value={risk.impact} />
          <Detail label="Unidad" value={risk.unit.name} />
          <Detail label="Categoría" value={risk.category.name} />
          <Detail label="Propietario" value={risk.owner?.name ?? "Pendiente"} />
          <Detail label="Creado por" value={risk.createdBy.name} />
          <Detail label="Descripción" value={risk.description} wide />
          <Detail label="Causas" value={risk.causes} />
          <Detail label="Consecuencias" value={risk.consequences} />
          <Detail label="Objetivos afectados" value={risk.affectedObjectives} />
        </div>

        {risk.acceptance && (
          <section className="border-t border-slate-200 bg-emerald-50/60 p-6 dark:border-slate-800 dark:bg-emerald-950/20">
            <h2 className="font-bold">Datos de aceptación</h2>
            <p className="mt-2 text-sm">{risk.acceptance.justification}</p>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Aprobado por {risk.acceptance.approvedBy.name}; revisión{" "}
              {formatDate(risk.acceptance.reviewDate)}
            </p>
          </section>
        )}

        {canUpdate && (
          <>
            <section className="border-t border-slate-200 dark:border-slate-800">
              <h2 className="px-6 pt-6 text-lg font-bold">Editar contexto</h2>
              <RiskForm
                risk={risk}
                categories={categories.filter(({ status }) => status === "activo")}
                units={units}
                owners={owners}
              />
            </section>
            {transitions.length > 0 && (
              <section className="border-t border-slate-200 p-6 dark:border-slate-800">
                <h2 className="mb-4 text-lg font-bold">Cambiar estado</h2>
                <div className="max-w-md">
                  <RiskTransitionForm riskId={risk.id} transitions={transitions} />
                </div>
              </section>
            )}
          </>
        )}
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-slate-100 p-4 dark:bg-slate-800">
      <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
      <p className="mt-2 font-mono text-2xl font-bold">{value}</p>
    </div>
  );
}

function Detail({
  label,
  value,
  wide = false,
}: {
  label: string;
  value: string;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "md:col-span-2" : ""}>
      <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
      <p className="mt-1 whitespace-pre-wrap text-sm">{value}</p>
    </div>
  );
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("es-BO", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(date);
}
