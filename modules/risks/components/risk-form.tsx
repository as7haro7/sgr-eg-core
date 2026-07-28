"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Calculator, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { FormSection } from "@/components/ui/form-section";
import { StatusBadge } from "@/components/ui/status-badge";
import type { BusinessUnitOption } from "@/modules/business-units/types/business-unit.types";
import type { RiskCategorySummary } from "@/modules/risks/types/risk-configuration.types";
import type {
  RiskCalculationPreview,
  RiskCriticality,
  RiskOwnerOption,
  RiskSummary,
} from "@/modules/risks/types/risk.types";
import {
  createRiskSchema,
  previewRiskSchema,
  type CreateRiskFormInput,
  type CreateRiskInput,
} from "@/modules/risks/validators/risk.validator";
import type { ApiResponse } from "@/types/api-response";

interface RiskFormProps {
  categories: RiskCategorySummary[];
  units: BusinessUnitOption[];
  owners: RiskOwnerOption[];
  risk?: RiskSummary;
}

type PreviewState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: RiskCalculationPreview }
  | { status: "error"; message: string };

const criticalityLabels: Record<RiskCriticality, string> = {
  low: "Bajo",
  moderate: "Moderado",
  high: "Alto",
  critical: "Crítico",
};

const criticalityTones: Record<
  RiskCriticality,
  "success" | "warning" | "danger"
> = {
  low: "success",
  moderate: "warning",
  high: "warning",
  critical: "danger",
};

const appetiteSourceLabels: Record<
  RiskCalculationPreview["appetiteSource"],
  string
> = {
  unit: "Excepción de unidad vigente",
  global: "Configuración global vigente",
  category: "Valor base de categoría",
};

export function RiskForm({
  categories,
  owners,
  risk,
  units,
}: RiskFormProps) {
  const router = useRouter();
  const [feedback, setFeedback] = useState<{
    type: "error" | "success";
    message: string;
  } | null>(null);
  const [preview, setPreview] = useState<PreviewState>({
    status: "idle",
  });
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
  } = useForm<CreateRiskFormInput, unknown, CreateRiskInput>({
    resolver: zodResolver(createRiskSchema),
    mode: "onChange",
    reValidateMode: "onChange",
    shouldFocusError: true,
    defaultValues: {
      title: risk?.title ?? "",
      description: risk?.description ?? "",
      causes: risk?.causes ?? "",
      consequences: risk?.consequences ?? "",
      affectedObjectives: risk?.affectedObjectives ?? "",
      categoryId: risk?.category.id ?? "",
      unitId: risk?.unit.id ?? "",
      ownerId: risk?.owner?.id ?? "",
      probability: risk?.probability ?? 1,
      impact: risk?.impact ?? 1,
      financialExposure: risk?.financialExposure ?? "",
      currency: risk?.currency ?? "",
    },
  });
  const [categoryId, unitId, probability, impact] = useWatch({
    control,
    name: ["categoryId", "unitId", "probability", "impact"],
  });

  useEffect(() => {
    const parsedInput = previewRiskSchema.safeParse({
      categoryId,
      unitId,
      probability,
      impact,
      riskId: risk?.id,
    });

    if (!parsedInput.success) {
      setPreview({ status: "idle" });
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setPreview({ status: "loading" });

      try {
        const response = await fetch("/api/risks/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(parsedInput.data),
          signal: controller.signal,
        });
        const payload =
          (await response.json()) as ApiResponse<RiskCalculationPreview>;

        if (!response.ok || !payload.data) {
          setPreview({ status: "error", message: payload.message });
          return;
        }

        setPreview({ status: "success", data: payload.data });
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setPreview({
          status: "error",
          message: "No fue posible calcular la previsualización.",
        });
      }
    }, 350);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [categoryId, unitId, probability, impact, risk?.id]);

  const onSubmit = async (input: CreateRiskInput) => {
    setFeedback(null);

    try {
      const response = await fetch(
        risk ? `/api/risks/${risk.id}` : "/api/risks",
        {
          method: risk ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        },
      );
      const payload = (await response.json()) as ApiResponse<RiskSummary>;

      if (!response.ok) {
        setFeedback({ type: "error", message: payload.message });
        return;
      }

      setFeedback({
        type: "success",
        message: risk ? "Riesgo actualizado." : "Riesgo registrado.",
      });

      if (payload.data) {
        router.push(`/risks/${payload.data.id}`);
        router.refresh();
      }
    } catch {
      setFeedback({
        type: "error",
        message: "No fue posible conectar con el servidor.",
      });
    }
  };

  return (
    <form
      className="space-y-6 border-b border-slate-200 bg-slate-50 p-4 sm:p-6"
      onSubmit={handleSubmit(onSubmit)}
      noValidate
    >
      <FormSection
        title="Identificación"
        description="Describe el riesgo y ubícalo en la categoría y unidad correspondientes."
        columns={3}
      >
      <FormField
        id="risk-title"
        label="Título"
        error={errors.title?.message}
      >
        <input className="form-input" {...register("title")} />
      </FormField>
      <FormField
        id="risk-category"
        label="Categoría"
        error={errors.categoryId?.message}
      >
        <select className="form-input" {...register("categoryId")}>
          <option value="">Seleccionar categoría</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </FormField>
      <FormField
        id="risk-unit"
        label="Unidad"
        error={errors.unitId?.message}
      >
        <select className="form-input" {...register("unitId")}>
          <option value="">Seleccionar unidad</option>
          {units.map((unit) => (
            <option key={unit.id} value={unit.id}>
              {unit.name}
            </option>
          ))}
        </select>
      </FormField>
      <FormField
        id="risk-description"
        label="Descripción"
        error={errors.description?.message}
        className="md:col-span-2 xl:col-span-3"
      >
        <textarea
          className="form-input min-h-24 py-2"
          {...register("description")}
        />
      </FormField>
      </FormSection>

      <FormSection
        title="Análisis cualitativo"
        description="Explica qué origina el riesgo, qué podría ocurrir y qué objetivos se verían afectados."
        columns={3}
      >
      <FormField
        id="risk-causes"
        label="Causas"
        error={errors.causes?.message}
      >
        <textarea
          className="form-input min-h-24 py-2"
          {...register("causes")}
        />
      </FormField>
      <FormField
        id="risk-consequences"
        label="Consecuencias"
        error={errors.consequences?.message}
      >
        <textarea
          className="form-input min-h-24 py-2"
          {...register("consequences")}
        />
      </FormField>
      <FormField
        id="risk-objectives"
        label="Objetivos afectados"
        error={errors.affectedObjectives?.message}
      >
        <textarea
          className="form-input min-h-24 py-2"
          {...register("affectedObjectives")}
        />
      </FormField>
      </FormSection>

      <FormSection
        title="Responsabilidad y valoración"
        description="Asigna un propietario y estima probabilidad, impacto y exposición financiera."
        columns={3}
      >
      <FormField
        id="risk-owner"
        label="Propietario"
        error={errors.ownerId?.message}
      >
        <select className="form-input" {...register("ownerId")}>
          <option value="">Pendiente</option>
          {owners.map((owner) => (
            <option key={owner.id} value={owner.id}>
              {owner.name}
            </option>
          ))}
        </select>
      </FormField>
      <div className="grid grid-cols-2 gap-3">
        <FormField
          id="risk-probability"
          label="Probabilidad (1–5)"
          error={errors.probability?.message}
        >
          <input
            type="number"
            min="1"
            max="5"
            inputMode="numeric"
            className="form-input"
            {...register("probability")}
          />
        </FormField>
        <FormField
          id="risk-impact"
          label="Impacto (1–5)"
          error={errors.impact?.message}
        >
          <input
            type="number"
            min="1"
            max="5"
            inputMode="numeric"
            className="form-input"
            {...register("impact")}
          />
        </FormField>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <FormField
          id="risk-exposure"
          label="Exposición"
          error={errors.financialExposure?.message}
        >
          <input
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            className="form-input"
            {...register("financialExposure")}
          />
        </FormField>
        <FormField
          id="risk-currency"
          label="Moneda"
          error={errors.currency?.message}
          hint="Código ISO de tres letras."
        >
          <input
            maxLength={3}
            autoCapitalize="characters"
            className="form-input uppercase"
            {...register("currency")}
          />
        </FormField>
      </div>
      </FormSection>

      <RiskPreview state={preview} isExistingRisk={Boolean(risk)} />

      <div className="form-actions -mx-4 -mb-4 sm:-mx-6 sm:-mb-6">
        {feedback && (
          <p
            className={
              feedback.type === "success"
                ? "text-sm text-green-700"
                : "text-sm text-red-700"
            }
            role={feedback.type === "error" ? "alert" : "status"}
          >
            {feedback.message}
          </p>
        )}
        <Button
          type="submit"
          className="w-full sm:w-auto"
          disabled={
            isSubmitting || categories.length === 0 || units.length === 0
          }
        >
          {isSubmitting && (
            <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
          )}
          {isSubmitting
            ? "Guardando riesgo..."
            : risk
              ? "Guardar cambios"
              : "Registrar riesgo"}
        </Button>
      </div>
    </form>
  );
}

function RiskPreview({
  state,
  isExistingRisk,
}: {
  state: PreviewState;
  isExistingRisk: boolean;
}) {
  return (
    <section
      className="rounded-xl border border-blue-200 bg-blue-50/60 p-4 md:col-span-2 xl:col-span-3"
      aria-labelledby="risk-preview-title"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-blue-700 text-white">
          <Calculator aria-hidden="true" className="size-5" />
        </div>
        <div>
          <h2
            id="risk-preview-title"
            className="font-semibold text-slate-950"
          >
            Previsualización calculada por el servidor
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            {isExistingRisk
              ? "El residual considera los controles activos actuales."
              : "Sin controles asociados, el residual coincide con el inherente."}
          </p>
        </div>
      </div>

      {state.status === "idle" && (
        <p className="mt-4 text-sm text-slate-600">
          Selecciona una categoría y una unidad para calcular el resultado.
        </p>
      )}
      {state.status === "loading" && (
        <p className="mt-4 flex items-center gap-2 text-sm text-blue-800">
          <LoaderCircle
            aria-hidden="true"
            className="size-4 animate-spin"
          />
          Calculando…
        </p>
      )}
      {state.status === "error" && (
        <p className="mt-4 text-sm text-red-700" role="alert">
          {state.message}
        </p>
      )}
      {state.status === "success" && (
        <>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <PreviewMetric
              label="Nivel inherente"
              value={state.data.inherentLevel}
              criticality={state.data.inherentCriticality}
            />
            <PreviewMetric
              label="Nivel residual"
              value={state.data.residualLevel}
              criticality={state.data.residualCriticality}
            />
            <PreviewMetric
              label="Efectividad acumulada"
              value={`${state.data.accumulatedEffectiveness}%`}
            />
            <PreviewMetric
              label="Apetito aplicable"
              value={state.data.appetiteThreshold}
            />
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <StatusBadge
              tone={state.data.exceedsAppetite ? "danger" : "success"}
            >
              {state.data.exceedsAppetite
                ? "Supera el apetito"
                : "Dentro del apetito"}
            </StatusBadge>
            <span className="text-xs text-slate-600">
              {appetiteSourceLabels[state.data.appetiteSource]}
            </span>
          </div>
        </>
      )}
    </section>
  );
}

function PreviewMetric({
  criticality,
  label,
  value,
}: {
  criticality?: RiskCriticality;
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-lg border border-blue-100 bg-white p-3">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <p className="text-xl font-bold tabular-nums text-slate-950">
          {value}
        </p>
        {criticality && (
          <StatusBadge tone={criticalityTones[criticality]}>
            {criticalityLabels[criticality]}
          </StatusBadge>
        )}
      </div>
    </div>
  );
}
