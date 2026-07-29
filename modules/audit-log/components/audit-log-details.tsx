import type { Prisma } from "@/generated/prisma/client";
import { formatAuditDetails } from "@/modules/audit-log/utils/audit-log-display";

export function AuditLogDetails({
  details,
}: {
  details: Prisma.JsonValue;
}) {
  const items = formatAuditDetails(details);

  if (items.length === 0) {
    return <span className="text-slate-400">Sin detalles adicionales</span>;
  }

  const hasChanges = items.some(
    ({ current, previous }) =>
      current !== undefined || previous !== undefined,
  );

  return (
    <details className="group min-w-64">
      <summary className="cursor-pointer font-semibold text-blue-700 hover:text-blue-900">
        {hasChanges
          ? `Ver ${items.length} ${items.length === 1 ? "cambio" : "cambios"}`
          : "Ver detalles"}
      </summary>
      <div className="mt-3 max-w-xl space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
        {items.map(({ current, label, previous, value }, index) => (
          <div
            key={`${label}-${index}`}
            className="rounded-lg bg-white px-3 py-2 shadow-sm ring-1 ring-slate-200"
          >
            <p className="text-xs font-bold tracking-wide text-slate-500 uppercase">
              {label}
            </p>
            {current !== undefined || previous !== undefined ? (
              <div className="mt-1 grid gap-2 text-xs sm:grid-cols-2">
                <p>
                  <span className="block text-slate-400">Antes</span>
                  <span className="break-words text-slate-700">
                    {previous}
                  </span>
                </p>
                <p>
                  <span className="block text-slate-400">Después</span>
                  <span className="break-words font-medium text-slate-950">
                    {current}
                  </span>
                </p>
              </div>
            ) : (
              <p className="mt-1 break-words text-sm text-slate-800">
                {value}
              </p>
            )}
          </div>
        ))}
      </div>
    </details>
  );
}
