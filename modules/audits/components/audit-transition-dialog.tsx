"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { GitBranch, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import type { estado_auditoria } from "@/generated/prisma/client";
import { auditStatusLabels } from "@/modules/audits/constants/audit";
import type { AuditSummary } from "@/modules/audits/types/audit.types";
import {
  transitionAuditSchema,
  type TransitionAuditInput,
} from "@/modules/audits/validators/audit.validator";
import type { ApiResponse } from "@/types/api-response";

export function AuditTransitionDialog({
  auditId,
  transitions,
}: {
  auditId: string;
  transitions: estado_auditoria[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const close = useCallback(() => {
    setOpen(false);
    setMessage(null);
  }, []);
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    watch,
  } = useForm<TransitionAuditInput>({
    resolver: zodResolver(transitionAuditSchema),
    defaultValues: { destination: transitions[0] },
  });
  const destination = watch("destination");

  const submit = async (input: TransitionAuditInput) => {
    setMessage(null);

    try {
      const response = await fetch(`/api/audits/${auditId}/transition`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const payload = (await response.json()) as ApiResponse<AuditSummary>;

      if (!response.ok) {
        setMessage(payload.message);
        return;
      }

      close();
      router.refresh();
    } catch {
      setMessage("No fue posible conectar con el servidor.");
    }
  };

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        <GitBranch aria-hidden="true" className="size-4" />
        Cambiar estado
      </Button>
      <Dialog
        open={open}
        onClose={() => {
          if (!isSubmitting) close();
        }}
        title="Cambiar estado de la auditoría"
        description="Solo se muestran las transiciones permitidas para el estado actual."
      >
        <form
          className="space-y-4 p-5"
          onSubmit={handleSubmit(submit)}
          noValidate
        >
          <FormField
            id="audit-destination"
            label="Nuevo estado"
            error={errors.destination?.message}
          >
            <select
              className="form-input"
              {...register("destination")}
            >
              {transitions.map((transition) => (
                <option key={transition} value={transition}>
                  {auditStatusLabels[transition]}
                </option>
              ))}
            </select>
          </FormField>

          {destination === "cerrada" && (
            <p className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-900">
              El cierre solo será permitido si todos los hallazgos están
              cerrados.
            </p>
          )}
          {destination === "cancelada" && (
            <p className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
              Una auditoría cancelada queda en un estado terminal y no puede
              reabrirse.
            </p>
          )}
          {message && (
            <p className="text-sm text-red-700" role="alert">
              {message}
            </p>
          )}

          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              disabled={isSubmitting}
              onClick={close}
            >
              Volver
            </Button>
            <Button
              type="submit"
              variant={
                destination === "cancelada" ? "danger" : "primary"
              }
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <LoaderCircle
                  aria-hidden="true"
                  className="size-4 animate-spin"
                />
              ) : (
                <GitBranch aria-hidden="true" className="size-4" />
              )}
              Confirmar cambio
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
