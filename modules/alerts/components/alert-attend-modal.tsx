"use client";

import { CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface AlertAttendModalProps {
  alertId: string;
}

export function AlertAttendModal({ alertId }: AlertAttendModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleAttend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/alerts/${alertId}/attend`, {
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
        className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-green-50 px-3 text-sm font-medium text-green-700 hover:bg-green-100"
      >
        <CheckCircle2 className="size-4" />
        Atender
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-slate-950">Atender Alerta</h3>
            <p className="mt-1 text-sm text-slate-600">
              Ingresa un comentario que justifique la atención de esta alerta.
            </p>
            <form onSubmit={handleAttend} className="mt-4 flex flex-col gap-4">
              <textarea
                autoFocus
                required
                className="form-input min-h-24 resize-none"
                placeholder="Comentario o acción tomada..."
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
                  className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                >
                  Confirmar Atención
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
