"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import type { estado_riesgo } from "@/generated/prisma/client";
import { riskStatusLabels } from "@/modules/risks/constants/risk-status";
import type { RiskSummary } from "@/modules/risks/types/risk.types";
import {
  transitionRiskSchema,
  type TransitionRiskFormInput,
  type TransitionRiskInput,
} from "@/modules/risks/validators/risk.validator";
import type { ApiResponse } from "@/types/api-response";

export function RiskTransitionForm({
  riskId,
  transitions,
}: {
  riskId: string;
  transitions: estado_riesgo[];
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    watch,
  } = useForm<
    TransitionRiskFormInput,
    unknown,
    TransitionRiskInput
  >({
    resolver: zodResolver(transitionRiskSchema),
    defaultValues: {
      destination: transitions[0],
      justification: "",
      reviewDate: null,
    },
  });
  const destination = watch("destination");

  const onSubmit = async (input: TransitionRiskInput) => {
    setMessage(null);

    try {
      const response = await fetch(`/api/risks/${riskId}/transition`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const payload = (await response.json()) as ApiResponse<RiskSummary>;

      setMessage(payload.message);

      if (response.ok) {
        router.refresh();
      }
    } catch {
      setMessage("No fue posible conectar con el servidor.");
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="risk-destination">
          Nuevo estado
        </label>
        <select
          id="risk-destination"
          className="form-input"
          {...register("destination")}
        >
          {transitions.map((transition) => (
            <option key={transition} value={transition}>
              {riskStatusLabels[transition]}
            </option>
          ))}
        </select>
      </div>
      {destination === "aceptado" && (
        <>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="acceptance-justification">
              Justificación
            </label>
            <textarea id="acceptance-justification" className="form-input min-h-20 py-2" {...register("justification")} />
            {errors.justification && <p className="text-sm text-red-600">{errors.justification.message}</p>}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="review-date">
              Fecha de revisión
            </label>
            <input id="review-date" type="date" className="form-input" {...register("reviewDate")} />
            {errors.reviewDate && <p className="text-sm text-red-600">{errors.reviewDate.message}</p>}
          </div>
        </>
      )}
      {message && <p className="text-sm text-slate-600">{message}</p>}
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting && <LoaderCircle className="size-4 animate-spin" />}
        Cambiar estado
      </Button>
    </form>
  );
}
