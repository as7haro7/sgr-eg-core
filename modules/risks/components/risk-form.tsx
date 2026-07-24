"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import type { BusinessUnitOption } from "@/modules/business-units/types/business-unit.types";
import type { RiskCategorySummary } from "@/modules/risks/types/risk-configuration.types";
import type {
  RiskOwnerOption,
  RiskSummary,
} from "@/modules/risks/types/risk.types";
import {
  createRiskSchema,
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
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
  } = useForm<CreateRiskFormInput, unknown, CreateRiskInput>({
    resolver: zodResolver(createRiskSchema),
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

      if (!risk) {
        reset();
      }

      setFeedback({
        type: "success",
        message: risk ? "Riesgo actualizado." : "Riesgo registrado.",
      });
      router.refresh();
    } catch {
      setFeedback({
        type: "error",
        message: "No fue posible conectar con el servidor.",
      });
    }
  };

  return (
    <form
      className="grid gap-4 border-b border-slate-200 p-6 md:grid-cols-2 xl:grid-cols-3 dark:border-slate-800"
      onSubmit={handleSubmit(onSubmit)}
    >
      <Field id="risk-title" label="Título" error={errors.title?.message}>
        <input id="risk-title" className="form-input" {...register("title")} />
      </Field>
      <Field
        id="risk-category"
        label="Categoría"
        error={errors.categoryId?.message}
      >
        <select id="risk-category" className="form-input" {...register("categoryId")}>
          <option value="">Seleccionar categoría</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </Field>
      <Field id="risk-unit" label="Unidad" error={errors.unitId?.message}>
        <select id="risk-unit" className="form-input" {...register("unitId")}>
          <option value="">Seleccionar unidad</option>
          {units.map((unit) => (
            <option key={unit.id} value={unit.id}>
              {unit.name}
            </option>
          ))}
        </select>
      </Field>
      <Field
        id="risk-description"
        label="Descripción"
        error={errors.description?.message}
        wide
      >
        <textarea
          id="risk-description"
          className="form-input min-h-20 py-2"
          {...register("description")}
        />
      </Field>
      <Field id="risk-causes" label="Causas" error={errors.causes?.message}>
        <textarea id="risk-causes" className="form-input min-h-20 py-2" {...register("causes")} />
      </Field>
      <Field
        id="risk-consequences"
        label="Consecuencias"
        error={errors.consequences?.message}
      >
        <textarea id="risk-consequences" className="form-input min-h-20 py-2" {...register("consequences")} />
      </Field>
      <Field
        id="risk-objectives"
        label="Objetivos afectados"
        error={errors.affectedObjectives?.message}
      >
        <textarea id="risk-objectives" className="form-input min-h-20 py-2" {...register("affectedObjectives")} />
      </Field>
      <Field id="risk-owner" label="Propietario" error={errors.ownerId?.message}>
        <select id="risk-owner" className="form-input" {...register("ownerId")}>
          <option value="">Pendiente</option>
          {owners.map((owner) => (
            <option key={owner.id} value={owner.id}>
              {owner.name}
            </option>
          ))}
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field id="risk-probability" label="Probabilidad (1–5)" error={errors.probability?.message}>
          <input id="risk-probability" type="number" min="1" max="5" className="form-input" {...register("probability")} />
        </Field>
        <Field id="risk-impact" label="Impacto (1–5)" error={errors.impact?.message}>
          <input id="risk-impact" type="number" min="1" max="5" className="form-input" {...register("impact")} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field
          id="risk-exposure"
          label="Exposición"
          error={errors.financialExposure?.message}
        >
          <input id="risk-exposure" type="number" min="0" step="0.01" className="form-input" {...register("financialExposure")} />
        </Field>
        <Field id="risk-currency" label="Moneda" error={errors.currency?.message}>
          <input id="risk-currency" maxLength={3} className="form-input uppercase" {...register("currency")} />
        </Field>
      </div>
      <div className="flex flex-col justify-end gap-3">
        {feedback && (
          <p
            className={
              feedback.type === "success"
                ? "text-sm text-emerald-700"
                : "text-sm text-red-600"
            }
            role="status"
          >
            {feedback.message}
          </p>
        )}
        <Button
          type="submit"
          disabled={
            isSubmitting || categories.length === 0 || units.length === 0
          }
        >
          {isSubmitting && <LoaderCircle className="size-4 animate-spin" />}
          {risk ? "Guardar cambios" : "Registrar riesgo"}
        </Button>
      </div>
    </form>
  );
}

function Field({
  children,
  error,
  id,
  label,
  wide = false,
}: {
  children: React.ReactNode;
  error?: string;
  id: string;
  label: string;
  wide?: boolean;
}) {
  return (
    <div className={`space-y-2 ${wide ? "md:col-span-2" : ""}`}>
      <label
        className="text-sm font-medium text-slate-800 dark:text-slate-200"
        htmlFor={id}
      >
        {label}
      </label>
      {children}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
