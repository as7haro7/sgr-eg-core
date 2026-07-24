"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Gauge, Layers3, LoaderCircle, SlidersHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import type { BusinessUnitSummary } from "@/modules/business-units/types/business-unit.types";
import type {
  RiskAppetiteSummary,
  RiskCategorySummary,
} from "@/modules/risks/types/risk-configuration.types";
import {
  createRiskAppetiteSchema,
  createRiskCategorySchema,
  type CreateRiskAppetiteFormInput,
  type CreateRiskAppetiteInput,
  type CreateRiskCategoryFormInput,
  type CreateRiskCategoryInput,
} from "@/modules/risks/validators/risk-configuration.validator";
import {
  createSystemParameterFormSchema,
  type CreateSystemParameterFormInput,
  type CreateSystemParameterInput,
} from "@/modules/shared/validators/system-parameter.validator";
import type { ApiResponse } from "@/types/api-response";

type Feedback = {
  type: "error" | "success";
  message: string;
};

interface RiskConfigurationFormsProps {
  categories: RiskCategorySummary[];
  units: BusinessUnitSummary[];
}

export function RiskConfigurationForms({
  categories,
  units,
}: RiskConfigurationFormsProps) {
  return (
    <div className="grid border-b border-slate-200 xl:grid-cols-3 xl:divide-x xl:divide-slate-200 dark:border-slate-800 dark:xl:divide-slate-800">
      <CategoryForm />
      <AppetiteForm
        categories={categories.filter(({ status }) => status === "activo")}
        units={units.filter(({ status }) => status === "activo")}
      />
      <ParameterForm />
    </div>
  );
}

function CategoryForm() {
  const router = useRouter();
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
  } = useForm<
    CreateRiskCategoryFormInput,
    unknown,
    CreateRiskCategoryInput
  >({
    resolver: zodResolver(createRiskCategorySchema),
    defaultValues: { name: "", description: "", baseAppetite: 10 },
  });

  const onSubmit = async (input: CreateRiskCategoryInput) => {
    setFeedback(null);
    const response = await sendJson<RiskCategorySummary>(
      "/api/risk-categories",
      input,
    );

    if (!response.ok) {
      setFeedback({ type: "error", message: response.message });
      return;
    }

    reset();
    setFeedback({ type: "success", message: "Categoría creada." });
    router.refresh();
  };

  return (
    <form className="space-y-4 p-6" onSubmit={handleSubmit(onSubmit)}>
      <FormTitle icon={<Layers3 className="size-4" />} title="Nueva categoría" />
      <Field id="category-name" label="Nombre" error={errors.name?.message}>
        <input id="category-name" className="form-input" {...register("name")} />
      </Field>
      <Field
        id="category-description"
        label="Descripción"
        error={errors.description?.message}
      >
        <textarea
          id="category-description"
          className="form-input min-h-20 py-2"
          {...register("description")}
        />
      </Field>
      <Field
        id="base-appetite"
        label="Apetito base (0–25)"
        error={errors.baseAppetite?.message}
      >
        <input
          id="base-appetite"
          type="number"
          min="0"
          max="25"
          step="0.01"
          className="form-input"
          {...register("baseAppetite")}
        />
      </Field>
      <SubmitArea feedback={feedback} isSubmitting={isSubmitting} label="Crear categoría" />
    </form>
  );
}

function AppetiteForm({
  categories,
  units,
}: RiskConfigurationFormsProps) {
  const router = useRouter();
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
  } = useForm<
    CreateRiskAppetiteFormInput,
    unknown,
    CreateRiskAppetiteInput
  >({
    resolver: zodResolver(createRiskAppetiteSchema),
    defaultValues: {
      categoryId: "",
      unitId: "",
      threshold: 10,
      validFrom: "",
      validUntil: "",
    },
  });

  const onSubmit = async (input: CreateRiskAppetiteInput) => {
    setFeedback(null);
    const response = await sendJson<RiskAppetiteSummary>(
      "/api/risk-appetites",
      input,
    );

    if (!response.ok) {
      setFeedback({ type: "error", message: response.message });
      return;
    }

    reset();
    setFeedback({ type: "success", message: "Vigencia registrada." });
    router.refresh();
  };

  return (
    <form className="space-y-4 p-6" onSubmit={handleSubmit(onSubmit)}>
      <FormTitle icon={<Gauge className="size-4" />} title="Nueva vigencia de apetito" />
      <Field id="appetite-category" label="Categoría" error={errors.categoryId?.message}>
        <select id="appetite-category" className="form-input" {...register("categoryId")}>
          <option value="">Seleccionar categoría</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>{category.name}</option>
          ))}
        </select>
      </Field>
      <Field id="appetite-unit" label="Unidad (opcional)" error={errors.unitId?.message}>
        <select id="appetite-unit" className="form-input" {...register("unitId")}>
          <option value="">Todas las unidades</option>
          {units.map((unit) => (
            <option key={unit.id} value={unit.id}>{unit.name}</option>
          ))}
        </select>
      </Field>
      <Field id="appetite-threshold" label="Umbral (0–25)" error={errors.threshold?.message}>
        <input id="appetite-threshold" type="number" min="0" max="25" step="0.01" className="form-input" {...register("threshold")} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field id="valid-from" label="Desde" error={errors.validFrom?.message}>
          <input id="valid-from" type="date" className="form-input" {...register("validFrom")} />
        </Field>
        <Field id="valid-until" label="Hasta (opcional)" error={errors.validUntil?.message}>
          <input id="valid-until" type="date" className="form-input" {...register("validUntil")} />
        </Field>
      </div>
      <SubmitArea
        feedback={feedback}
        isSubmitting={isSubmitting}
        label="Registrar vigencia"
        disabled={categories.length === 0}
      />
    </form>
  );
}

function ParameterForm() {
  const router = useRouter();
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
  } = useForm<
    CreateSystemParameterFormInput,
    unknown,
    CreateSystemParameterInput
  >({
    resolver: zodResolver(createSystemParameterFormSchema),
    defaultValues: { key: "", valueText: "", description: "" },
  });

  const onSubmit = async (input: CreateSystemParameterInput) => {
    setFeedback(null);
    const response = await sendJson("/api/system-parameters", input);

    if (!response.ok) {
      setFeedback({ type: "error", message: response.message });
      return;
    }

    reset();
    setFeedback({ type: "success", message: "Parámetro creado." });
    router.refresh();
  };

  return (
    <form className="space-y-4 p-6" onSubmit={handleSubmit(onSubmit)}>
      <FormTitle icon={<SlidersHorizontal className="size-4" />} title="Nuevo parámetro" />
      <Field id="parameter-key" label="Clave" error={errors.key?.message}>
        <input id="parameter-key" className="form-input" {...register("key")} />
      </Field>
      <Field id="parameter-value" label="Valor JSON" error={errors.valueText?.message}>
        <textarea
          id="parameter-value"
          className="form-input min-h-20 py-2 font-mono"
          placeholder={'30, true, "texto" o {"campo":"valor"}'}
          {...register("valueText")}
        />
      </Field>
      <Field id="parameter-description" label="Descripción" error={errors.description?.message}>
        <textarea id="parameter-description" className="form-input min-h-20 py-2" {...register("description")} />
      </Field>
      <SubmitArea feedback={feedback} isSubmitting={isSubmitting} label="Crear parámetro" />
    </form>
  );
}

async function sendJson<T = unknown>(
  url: string,
  body: unknown,
): Promise<{ ok: boolean; message: string; data: T | null }> {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = (await response.json()) as ApiResponse<T>;

    return { ok: response.ok, message: payload.message, data: payload.data };
  } catch {
    return {
      ok: false,
      message: "No fue posible conectar con el servidor.",
      data: null,
    };
  }
}

function FormTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <h2 className="flex items-center gap-2 text-lg font-bold text-slate-950 dark:text-white">
      {icon}
      {title}
    </h2>
  );
}

function Field({
  children,
  error,
  id,
  label,
}: {
  children: React.ReactNode;
  error?: string;
  id: string;
  label: string;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-800 dark:text-slate-200" htmlFor={id}>
        {label}
      </label>
      {children}
      {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
    </div>
  );
}

function SubmitArea({
  disabled = false,
  feedback,
  isSubmitting,
  label,
}: {
  disabled?: boolean;
  feedback: Feedback | null;
  isSubmitting: boolean;
  label: string;
}) {
  return (
    <>
      {feedback && (
        <p
          className={feedback.type === "success" ? "text-sm text-emerald-700" : "text-sm text-red-600"}
          role="status"
        >
          {feedback.message}
        </p>
      )}
      <Button type="submit" disabled={disabled || isSubmitting}>
        {isSubmitting && <LoaderCircle className="size-4 animate-spin" />}
        {label}
      </Button>
    </>
  );
}
