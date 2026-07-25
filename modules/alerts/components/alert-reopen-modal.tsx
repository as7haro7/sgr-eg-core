"use client";

import { RefreshCw } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface AlertReopenModalProps {
  alertId: string;
}

export function AlertReopenModal({ alertId }: AlertReopenModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleReopen = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/alerts/${alertId}/reopen`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment }),
      });
      if (res.ok) {
        setIsOpen(false);
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 hover:bg-slate-50"
      >
        <RefreshCw className="size-4" />
        Reabrir
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-slate-950">Reabrir Alerta</h3>
            <p className="mt-1 text-sm text-slate-600">
              Ingresa el motivo por el cual esta alerta debe ser reabierta.
            </p>
            <form onSubmit={handleReopen} className="mt-4 flex flex-col gap-4">
              <textarea
                autoFocus
                required
                className="form-input min-h-24 resize-none"
                placeholder="Motivo de la reapertura..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                disabled={loading}
              />
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  disabled={loading}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading || !comment.trim()}
                  className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50"
                >
                  Reabrir Alerta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
