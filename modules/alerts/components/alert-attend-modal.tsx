"use client";

import { CheckCircle2, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";

interface AlertAttendModalProps {
  alertId: string;
}

export function AlertAttendModal({ alertId }: AlertAttendModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const close = () => {
    if (loading) return;
    setIsOpen(false);
    setError(null);
  };

  const handleAttend = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!comment.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/alerts/${alertId}/attend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment: comment.trim() }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { message?: string }
        | null;

      if (!response.ok) {
        setError(payload?.message ?? "No fue posible atender la alerta.");
        return;
      }

      setIsOpen(false);
      setComment("");
      router.refresh();
    } catch {
      setError(
        "No se pudo conectar con el servidor. Revisa tu conexión e inténtalo nuevamente.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        variant="secondary"
        onClick={() => setIsOpen(true)}
        className="min-h-9 border-green-200 bg-green-50 px-3 text-green-700 hover:bg-green-100"
      >
        <CheckCircle2 aria-hidden="true" className="size-4" />
        Atender
      </Button>

      <Dialog
        open={isOpen}
        onClose={close}
        title="Atender alerta"
        description="Describe brevemente la acción realizada para que quede registrada en el historial."
      >
        <form onSubmit={handleAttend} className="space-y-5 p-5 sm:p-6">
          <div>
            <label
              htmlFor={`attend-comment-${alertId}`}
              className="form-label"
            >
              Comentario de atención
            </label>
            <textarea
              id={`attend-comment-${alertId}`}
              autoFocus
              required
              className="form-input min-h-28 resize-y"
              placeholder="Ej.: Se verificó el vencimiento y se coordinó la acción correctiva…"
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              disabled={loading}
            />
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
            >
              {error}
            </p>
          )}

          <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={close} disabled={loading}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading || !comment.trim()}
              className="bg-green-700 hover:bg-green-800"
            >
              {loading && (
                <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
              )}
              {loading ? "Guardando atención..." : "Confirmar atención"}
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
