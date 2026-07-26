"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, Flag, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import type {
  BusinessUnitSummary,
  CountrySummary,
} from "@/modules/business-units/types/business-unit.types";
import {
  createBusinessUnitSchema,
  createCountrySchema,
  type CreateBusinessUnitFormInput,
  type CreateBusinessUnitInput,
  type CreateCountryFormInput,
  type CreateCountryInput,
} from "@/modules/business-units/validators/organization.validator";
import type { ApiResponse } from "@/types/api-response";

interface OrganizationFormsProps {
  countries: CountrySummary[];
  section: "countries" | "units";
}

type Feedback = {
  type: "error" | "success";
  message: string;
};

export function OrganizationForms({
  countries,
  section,
}: OrganizationFormsProps) {
  const [activeDialog, setActiveDialog] = useState<
    "country" | "unit" | null
  >(null);
  const close = useCallback(() => setActiveDialog(null), []);
  const activeCountries = countries.filter(
    ({ status }) => status === "activo",
  );

  return (
    <>
      {section === "countries" ? (
        <Button onClick={() => setActiveDialog("country")}>
          <Flag aria-hidden="true" className="size-4" />
          Nuevo país
        </Button>
      ) : (
        <Button
          onClick={() => setActiveDialog("unit")}
          disabled={activeCountries.length === 0}
        >
          <Building2 aria-hidden="true" className="size-4" />
          Nueva unidad
        </Button>
      )}
        {section === "units" && activeCountries.length === 0 && (
          <p className="max-w-xs text-sm text-amber-800">
            Crea primero un país activo para registrar unidades.
          </p>
        )}
      <Dialog
        open={activeDialog === "country"}
        onClose={close}
        title="Nuevo país"
        description="Registra el país y su código ISO."
      >
        <CountryForm onSuccess={close} />
      </Dialog>
      <Dialog
        open={activeDialog === "unit"}
        onClose={close}
        title="Nueva unidad de negocio"
        description="Asocia la unidad con su país y moneda operativa."
      >
        <BusinessUnitForm
          countries={activeCountries}
          onSuccess={close}
        />
      </Dialog>
    </>
  );
}

function CountryForm({ onSuccess }: { onSuccess: () => void }) {
  const router = useRouter();
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
  } = useForm<CreateCountryFormInput, unknown, CreateCountryInput>({
    resolver: zodResolver(createCountrySchema),
    defaultValues: { name: "", isoCode: "" },
  });

  const onSubmit = async (input: CreateCountryInput) => {
    setFeedback(null);

    try {
      const response = await fetch("/api/countries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const payload = (await response.json()) as ApiResponse<CountrySummary>;

      if (!response.ok) {
        setFeedback({ type: "error", message: payload.message });
        return;
      }

      reset();
      setFeedback({ type: "success", message: "País creado." });
      router.refresh();
      onSuccess();
    } catch {
      setFeedback({
        type: "error",
        message: "No fue posible conectar con el servidor.",
      });
    }
  };

  return (
    <form className="space-y-4 p-6" onSubmit={handleSubmit(onSubmit)}>
      <Field label="Nombre" id="country-name" error={errors.name?.message}>
        <input
          id="country-name"
          className="form-input"
          {...register("name")}
        />
      </Field>
      <Field
        label="Código ISO (2 letras)"
        id="iso-code"
        error={errors.isoCode?.message}
      >
        <input
          id="iso-code"
          className="form-input uppercase"
          maxLength={2}
          {...register("isoCode")}
        />
      </Field>
      <FeedbackMessage feedback={feedback} />
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting && (
          <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
        )}
        Crear país
      </Button>
    </form>
  );
}

function BusinessUnitForm({
  countries,
  onSuccess,
}: {
  countries: CountrySummary[];
  onSuccess: () => void;
}) {
  const router = useRouter();
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
  } = useForm<
    CreateBusinessUnitFormInput,
    unknown,
    CreateBusinessUnitInput
  >({
    resolver: zodResolver(createBusinessUnitSchema),
    defaultValues: { name: "", countryId: "", currency: "" },
  });

  const onSubmit = async (input: CreateBusinessUnitInput) => {
    setFeedback(null);

    try {
      const response = await fetch("/api/business-units", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const payload =
        (await response.json()) as ApiResponse<BusinessUnitSummary>;

      if (!response.ok) {
        setFeedback({ type: "error", message: payload.message });
        return;
      }

      reset();
      setFeedback({
        type: "success",
        message: "Unidad de negocio creada.",
      });
      router.refresh();
      onSuccess();
    } catch {
      setFeedback({
        type: "error",
        message: "No fue posible conectar con el servidor.",
      });
    }
  };

  return (
    <form className="space-y-4 p-6" onSubmit={handleSubmit(onSubmit)}>
      <Field label="Nombre" id="unit-name" error={errors.name?.message}>
        <input
          id="unit-name"
          className="form-input"
          {...register("name")}
        />
      </Field>
      <Field
        label="País"
        id="country-id"
        error={errors.countryId?.message}
      >
        <select
          id="country-id"
          className="form-input"
          disabled={countries.length === 0}
          {...register("countryId")}
        >
          <option value="">Seleccionar país</option>
          {countries.map((country) => (
            <option key={country.id} value={country.id}>
              {country.name} ({country.isoCode})
            </option>
          ))}
        </select>
      </Field>
      <Field
        label="Moneda ISO (3 letras)"
        id="currency"
        error={errors.currency?.message}
      >
        <input
          id="currency"
          className="form-input uppercase"
          maxLength={3}
          {...register("currency")}
        />
      </Field>
      {countries.length === 0 && (
        <p className="text-sm text-amber-700 dark:text-amber-300">
          Primero debes crear un país activo.
        </p>
      )}
      <FeedbackMessage feedback={feedback} />
      <Button
        type="submit"
        disabled={isSubmitting || countries.length === 0}
      >
        {isSubmitting && (
          <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
        )}
        Crear unidad
      </Button>
    </form>
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
      <label
        className="text-sm font-medium text-slate-800 dark:text-slate-200"
        htmlFor={id}
      >
        {label}
      </label>
      {children}
      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function FeedbackMessage({ feedback }: { feedback: Feedback | null }) {
  if (!feedback) {
    return null;
  }

  return (
    <p
      className={
        feedback.type === "success"
          ? "text-sm text-emerald-700 dark:text-emerald-300"
          : "text-sm text-red-600 dark:text-red-300"
      }
      role="status"
    >
      {feedback.message}
    </p>
  );
}
