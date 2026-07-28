"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ClipboardPlus, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { FormSection } from "@/components/ui/form-section";
import type { BusinessUnitOption } from "@/modules/business-units/types/business-unit.types";
import type {
  AuditSummary,
  AuditUserOption,
} from "@/modules/audits/types/audit.types";
import {
  createAuditSchema,
  type CreateAuditFormInput,
  type CreateAuditInput,
} from "@/modules/audits/validators/audit.validator";
import type { ApiResponse } from "@/types/api-response";

interface AuditFormProps {
  audit?: AuditSummary;
  currentUserId: string;
  units: BusinessUnitOption[];
  users: AuditUserOption[];
}

export function AuditForm({
  audit,
  currentUserId,
  units,
  users,
}: AuditFormProps) {
  const router = useRouter();
  const [feedback, setFeedback] = useState<{
    type: "error" | "success";
    message: string;
  } | null>(null);
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
  } = useForm<CreateAuditFormInput, unknown, CreateAuditInput>({
    resolver: zodResolver(createAuditSchema),
    mode: "onChange",
    defaultValues: {
      objective: audit?.objective ?? "",
      scope: audit?.scope ?? "",
      startDate: audit ? toDateInput(audit.startDate) : "",
      endDate: audit?.endDate ? toDateInput(audit.endDate) : "",
      responsibleId: audit?.responsible.id ?? currentUserId,
      unitId: audit?.unit?.id ?? "",
      teamMemberIds: audit?.team.map(({ id }) => id) ?? [],
    },
  });

  const submit = async (input: CreateAuditInput) => {
    setFeedback(null);

    try {
      const response = await fetch(
        audit ? `/api/audits/${audit.id}` : "/api/audits",
        {
        method: audit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
        },
      );
      const payload = (await response.json()) as ApiResponse<AuditSummary>;

      setFeedback({
        type: response.ok ? "success" : "error",
        message: payload.message,
      });

      if (response.ok && payload.data) {
        router.push(`/audits/${payload.data.id}`);
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
      onSubmit={handleSubmit(submit)}
      noValidate
    >
      <FormSection
        title="Alcance de la auditoría"
        description="Define qué se auditará y a qué unidad corresponde."
        columns={3}
      >
      <FormField
        id="audit-objective"
        label="Objetivo"
        error={errors.objective?.message}
        className="md:col-span-2"
      >
        <input className="form-input" {...register("objective")} />
      </FormField>
      <FormField
        id="audit-unit"
        label="Unidad auditada"
        error={errors.unitId?.message}
      >
        <select className="form-input" {...register("unitId")}>
          <option value="">Alcance corporativo</option>
          {units.map((unit) => (
            <option key={unit.id} value={unit.id}>
              {unit.name}
            </option>
          ))}
        </select>
      </FormField>
      <FormField
        id="audit-scope"
        label="Alcance"
        error={errors.scope?.message}
        className="md:col-span-2"
      >
        <textarea
          className="form-input min-h-24 py-2"
          {...register("scope")}
        />
      </FormField>
      </FormSection>

      <FormSection
        title="Responsables y calendario"
        description="Asigna al responsable, conforma el equipo y establece las fechas previstas."
        columns={3}
      >
      <FormField
        id="audit-responsible"
        label="Responsable"
        error={errors.responsibleId?.message}
      >
        <select className="form-input" {...register("responsibleId")}>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name}
            </option>
          ))}
        </select>
      </FormField>
      <FormField
        id="audit-start"
        label="Fecha de inicio"
        error={errors.startDate?.message}
      >
        <input
          type="date"
          className="form-input"
          {...register("startDate")}
        />
      </FormField>
      <FormField
        id="audit-end"
        label="Fecha final prevista"
        error={errors.endDate?.message}
      >
        <input type="date" className="form-input" {...register("endDate")} />
      </FormField>
      <FormField
        id="audit-team"
        label="Equipo auditor"
        error={errors.teamMemberIds?.message}
        hint="Puedes seleccionar varios integrantes con Ctrl o Cmd."
      >
        <select
          multiple
          className="form-input min-h-28 py-2"
          {...register("teamMemberIds")}
        >
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name}
            </option>
          ))}
        </select>
      </FormField>
      </FormSection>
      <div className="form-actions -mx-4 -mb-4 sm:-mx-6 sm:-mb-6">
        {feedback && (
          <p
            className={
              feedback.type === "error"
                ? "text-sm text-red-700"
                : "text-sm text-green-700"
            }
            role={feedback.type === "error" ? "alert" : "status"}
          >
            {feedback.message}
          </p>
        )}
        <Button type="submit" disabled={isSubmitting || users.length === 0}>
          {isSubmitting ? (
            <LoaderCircle
              aria-hidden="true"
              className="size-4 animate-spin"
            />
          ) : (
            <ClipboardPlus aria-hidden="true" className="size-4" />
          )}
          {isSubmitting
            ? "Guardando auditoría..."
            : audit
              ? "Guardar cambios"
              : "Planificar auditoría"}
        </Button>
      </div>
    </form>
  );
}

function toDateInput(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  return date.toISOString().slice(0, 10);
}
