"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import type { SystemParameterSummary } from "@/modules/shared/types/system-parameter.types";
import {
  updateSystemParameterFormSchema,
  type UpdateSystemParameterFormInput,
  type UpdateSystemParameterInput,
} from "@/modules/shared/validators/system-parameter.validator";
import type { ApiResponse } from "@/types/api-response";

export function SystemParameterEditor({
  parameter,
}: {
  parameter: SystemParameterSummary;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
  } = useForm<
    UpdateSystemParameterFormInput,
    unknown,
    UpdateSystemParameterInput
  >({
    resolver: zodResolver(updateSystemParameterFormSchema),
    defaultValues: {
      valueText: JSON.stringify(parameter.value, null, 2),
      description: parameter.description,
    },
  });

  const onSubmit = async (input: UpdateSystemParameterInput) => {
    setMessage(null);

    try {
      const response = await fetch(
        `/api/system-parameters/${encodeURIComponent(parameter.key)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        },
      );
      const payload =
        (await response.json()) as ApiResponse<SystemParameterSummary>;

      setMessage(payload.message);

      if (response.ok) {
        router.refresh();
      }
    } catch {
      setMessage("No fue posible conectar con el servidor.");
    }
  };

  return (
    <form
      className="space-y-3 rounded-xl border border-slate-200 p-4 dark:border-slate-800"
      onSubmit={handleSubmit(onSubmit)}
    >
      <div>
        <h3 className="font-mono text-sm font-bold text-slate-950 dark:text-white">
          {parameter.key}
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          Actualizado {new Intl.DateTimeFormat("es-BO", {
            dateStyle: "medium",
            timeStyle: "short",
            timeZone: "America/La_Paz",
          }).format(parameter.updatedAt)}
        </p>
      </div>
      <textarea
        aria-label={`Valor de ${parameter.key}`}
        className="form-input min-h-20 py-2 font-mono"
        {...register("valueText")}
      />
      {errors.valueText && <p className="text-sm text-red-600">{errors.valueText.message}</p>}
      <textarea
        aria-label={`Descripción de ${parameter.key}`}
        className="form-input min-h-16 py-2"
        {...register("description")}
      />
      {errors.description && <p className="text-sm text-red-600">{errors.description.message}</p>}
      {message && <p className="text-sm text-slate-600 dark:text-slate-300">{message}</p>}
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}
        Guardar
      </Button>
    </form>
  );
}
