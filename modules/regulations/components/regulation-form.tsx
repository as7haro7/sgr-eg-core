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
  regulationFormSchema,
  type RegulationFormInput,
  type RegulationFormOutput,
} from "@/modules/regulations/validators/regulation.validator";
import type { ApiResponse } from "@/types/api-response";

export function RegulationForm({
  allowGlobalScope = false,
  countries,
  regulation,
  onSuccess,
}: {
  allowGlobalScope?: boolean;
  countries: CountrySummary[];
  regulation?: RegulationSummary;
  onSuccess?: () => void;
}) {
  const router = useRouter();
  const [feedback, setFeedback] = useState<string | null>(null);
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
  } = useForm<RegulationFormInput, unknown, RegulationFormOutput>({
    resolver: zodResolver(regulationFormSchema),
    mode: "onChange",
    defaultValues: {
      name: regulation?.name ?? "",
      jurisdiction: regulation?.jurisdiction ?? "",
      countryId: regulation?.countryId ?? "",
      version: regulation?.version ?? "1.0",
      validFrom: regulation ? toDateInput(regulation.validFrom) : "",
      validUntil: regulation?.validUntil ? toDateInput(regulation.validUntil) : "",
      ...(regulation ? { status: regulation.status } : {}),
    },
  });

  const submit = async (input: RegulationFormOutput) => {
    setFeedback(null);
    try {
      const response = await fetch(
        regulation ? `/api/regulations/${regulation.id}` : "/api/regulations",
        {
        method: regulation ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
        },
      );
      const payload = (await response.json()) as ApiResponse<RegulationSummary>;
      if (!response.ok || !payload.data) {
        setFeedback(payload.message);
        return;
      }
      if (regulation) {
        setFeedback(null);
        onSuccess?.();
      } else {
        router.push(`/compliance/regulations/${payload.data.id}`);
      }
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
      {regulation && (
        <FormField
          id="regulation-status"
          label="Estado"
          error={errors.status?.message}
        >
          <select className="form-input" {...register("status")}>
            <option value="vigente">Vigente</option>
            <option value="derogada">Derogada</option>
          </select>
        </FormField>
      )}
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
          {allowGlobalScope && <option value="">Aplicación general</option>}
          {!allowGlobalScope && (
            <option value="" disabled>
              Selecciona un país
            </option>
          )}
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
          {regulation ? "Guardar cambios" : "Guardar normativa"}
        </Button>
      </div>
    </form>
  );
}

function toDateInput(date: Date | string): string {
  return new Date(date).toISOString().slice(0, 10);
}
