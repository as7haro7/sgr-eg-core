"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { BookPlus, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import type { CountrySummary } from "@/modules/business-units/types/business-unit.types";
import type { RegulationSummary } from "@/modules/regulations/types/regulation.types";
import {
  createRegulationSchema,
  type CreateRegulationFormInput,
  type CreateRegulationInput,
} from "@/modules/regulations/validators/regulation.validator";
import type { ApiResponse } from "@/types/api-response";

export function RegulationForm({
  countries,
}: {
  countries: CountrySummary[];
}) {
  const router = useRouter();
  const [feedback, setFeedback] = useState<string | null>(null);
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
  } = useForm<CreateRegulationFormInput, unknown, CreateRegulationInput>({
    resolver: zodResolver(createRegulationSchema),
    mode: "onChange",
    defaultValues: {
      name: "",
      jurisdiction: "",
      countryId: "",
      version: "1.0",
      validFrom: "",
      validUntil: "",
    },
  });

  const submit = async (input: CreateRegulationInput) => {
    setFeedback(null);
    try {
      const response = await fetch("/api/regulations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const payload = (await response.json()) as ApiResponse<RegulationSummary>;
      if (!response.ok || !payload.data) {
        setFeedback(payload.message);
        return;
      }
      router.push(`/compliance/regulations/${payload.data.id}`);
      router.refresh();
    } catch {
      setFeedback("No fue posible conectar con el servidor.");
    }
  };

  return (
    <form
      className="grid gap-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-2"
      onSubmit={handleSubmit(submit)}
      noValidate
    >
      <FormField
        id="regulation-name"
        label="Nombre"
        error={errors.name?.message}
      >
        <input className="form-input" {...register("name")} />
      </FormField>
      <FormField
        id="regulation-jurisdiction"
        label="Jurisdicción"
        error={errors.jurisdiction?.message}
      >
        <input className="form-input" {...register("jurisdiction")} />
      </FormField>
      <FormField
        id="regulation-country"
        label="País"
        error={errors.countryId?.message}
      >
        <select className="form-input" {...register("countryId")}>
          <option value="">Aplicación general</option>
          {countries
            .filter(({ status }) => status === "activo")
            .map((country) => (
              <option key={country.id} value={country.id}>
                {country.name}
              </option>
            ))}
        </select>
      </FormField>
      <FormField
        id="regulation-version"
        label="Versión"
        error={errors.version?.message}
      >
        <input className="form-input" {...register("version")} />
      </FormField>
      <FormField
        id="regulation-valid-from"
        label="Vigente desde"
        error={errors.validFrom?.message}
      >
        <input
          className="form-input"
          type="date"
          {...register("validFrom")}
        />
      </FormField>
      <FormField
        id="regulation-valid-until"
        label="Vigente hasta (opcional)"
        error={errors.validUntil?.message}
      >
        <input
          className="form-input"
          type="date"
          {...register("validUntil")}
        />
      </FormField>

      {feedback && (
        <p
          className="rounded-lg bg-red-50 p-3 text-sm text-red-700 md:col-span-2"
          role="alert"
        >
          {feedback}
        </p>
      )}

      <div className="md:col-span-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
          ) : (
            <BookPlus aria-hidden="true" className="size-4" />
          )}
          Guardar normativa
        </Button>
      </div>
    </form>
  );
}
