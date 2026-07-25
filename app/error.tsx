"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";
import { useEffect } from "react";

export default function ApplicationError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Next.js conserva el detalle técnico en el servidor mediante el digest.
    if (process.env.NODE_ENV === "development") {
      console.error(error);
    }
  }, [error]);

  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 p-6">
      <section className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-red-50 text-red-700">
          <AlertTriangle aria-hidden="true" className="size-6" />
        </div>
        <h1 className="mt-4 text-xl font-bold text-slate-950">
          No fue posible completar la operación
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Intenta nuevamente. Si el problema continúa, comunícalo al
          administrador indicando la hora en que ocurrió.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white hover:bg-blue-800"
        >
          <RotateCcw aria-hidden="true" className="size-4" />
          Reintentar
        </button>
      </section>
    </main>
  );
}
