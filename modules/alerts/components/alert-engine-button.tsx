"use client";

import { AlertCircle, CheckCircle2, LoaderCircle, Play } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function AlertEngineButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ message: string; isError: boolean } | null>(null);
  const router = useRouter();

  const handleRun = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/alerts/engine", { method: "POST" });
      const data = await res.json();
      
      if (res.ok) {
        setResult({ message: `Motor ejecutado. ${data.generatedCount} alertas generadas.`, isError: false });
        router.refresh();
      } else {
        setResult({ message: data.message || "Error al ejecutar el motor", isError: true });
      }
    } catch {
      setResult({ message: "Error de red al ejecutar el motor", isError: true });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-start gap-3">
      <button
        onClick={handleRun}
        disabled={loading}
        className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
      >
        {loading ? (
          <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
        ) : (
          <Play aria-hidden="true" className="size-4" />
        )}
        {loading ? "Ejecutando motor..." : "Ejecutar motor de alertas"}
      </button>

      {result && (
        <div
          role={result.isError ? "alert" : "status"}
          aria-live="polite"
          className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${
            result.isError
              ? "bg-red-50 text-red-700"
              : "bg-green-50 text-green-700"
          }`}
        >
          {result.isError ? (
            <AlertCircle className="size-4" />
          ) : (
            <CheckCircle2 className="size-4" />
          )}
          {result.message}
        </div>
      )}
    </div>
  );
}
