"use client";

import { LoaderCircle, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";

interface AlertReopenModalProps {
  alertId: string;
}

export function AlertReopenModal({ alertId }: AlertReopenModalProps) {
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

  const handleReopen = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!comment.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/alerts/${alertId}/reopen`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment: comment.trim() }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { message?: string }
        | null;

      if (!response.ok) {
        setError(payload?.message ?? "No fue posible reabrir la alerta.");
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
        className="min-h-9 px-3 text-slate-700"
      >
        <RefreshCw aria-hidden="true" className="size-4" />
        Reabrir
      </Button>

      <Dialog
        open={isOpen}
        onClose={close}
        title="Reabrir alerta"
        description="Indica por qué la atención anterior ya no es suficiente o requiere seguimiento."
      >
        <form onSubmit={handleReopen} className="space-y-5 p-5 sm:p-6">
          <div>
            <label
              htmlFor={`reopen-comment-${alertId}`}
              className="form-label"
            >
              Motivo de reapertura
            </label>
            <textarea
              id={`reopen-comment-${alertId}`}
              autoFocus
              required
              className="form-input min-h-28 resize-y"
              placeholder="Ej.: La medida aplicada no resolvió el incumplimiento detectado…"
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
            <Button type="submit" disabled={loading || !comment.trim()}>
              {loading && (
                <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
              )}
              {loading ? "Reabriendo alerta..." : "Confirmar reapertura"}
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
