"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ClipboardPlus, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import {
  evaluationResultLabels,
  evaluationResults,
} from "@/modules/compliance/constants/evaluation";
import type {
  ComplianceParty,
  EvaluationSummary,
  EvaluationUnitOption,
  RequirementOption,
} from "@/modules/compliance/types/evaluation.types";
import {
  createEvaluationSchema,
  type CreateEvaluationFormInput,
  type CreateEvaluationInput,
} from "@/modules/compliance/validators/evaluation.validator";
import type { ApiResponse } from "@/types/api-response";

interface EvaluationFormProps {
  requirements: RequirementOption[];
  units: EvaluationUnitOption[];
  users: ComplianceParty[];
}

export function EvaluationForm({
  requirements,
  units,
  users,
}: EvaluationFormProps) {
  const router = useRouter();
  const [feedback, setFeedback] = useState<string | null>(null);
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    watch,
  } = useForm<
    CreateEvaluationFormInput,
    unknown,
    CreateEvaluationInput
  >({
    resolver: zodResolver(createEvaluationSchema),
    mode: "onChange",
    defaultValues: {
      requirementId: requirements[0]?.id ?? "",
      unitId: units[0]?.id ?? "",
      periodStart: "",
      periodEnd: "",
      result: "conforme",
      observations: "",
      notApplicableJustification: "",
      actionPlan: "",
      planResponsibleId: "",
      planDeadline: "",
    },
  });
  const result = watch("result");

  const submit = async (input: CreateEvaluationInput) => {
    setFeedback(null);

    try {
      const response = await fetch("/api/compliance/evaluations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const payload = (await response.json()) as ApiResponse<EvaluationSummary>;

      if (!response.ok || !payload.data) {
        setFeedback(payload.message);
        return;
      }

      router.push(`/compliance/evaluations/${payload.data.id}`);
      router.refresh();
    } catch {
      setFeedback("No fue posible conectar con el servidor.");
    }
  };

  return (
    <form
      className="grid gap-5 bg-slate-50 p-6 md:grid-cols-2"
      onSubmit={handleSubmit(submit)}
      noValidate
    >
      <FormField
        id="evaluation-requirement"
        label="Requisito normativo"
        error={errors.requirementId?.message}
        className="md:col-span-2"
      >
        <select
          className="form-input"
          {...register("requirementId")}
        >
          {requirements.map((requirement) => (
            <option key={requirement.id} value={requirement.id}>
              {requirement.regulation.name} · {requirement.code} v
              {requirement.version}
            </option>
          ))}
        </select>
      </FormField>
      <FormField
        id="evaluation-unit"
        label="Unidad evaluada"
        error={errors.unitId?.message}
      >
        <select className="form-input" {...register("unitId")}>
          {units.map((unit) => (
            <option key={unit.id} value={unit.id}>
              {unit.name}
            </option>
          ))}
        </select>
      </FormField>
      <FormField
        id="evaluation-result"
        label="Resultado"
        error={errors.result?.message}
      >
        <select className="form-input" {...register("result")}>
          {evaluationResults.map((value) => (
            <option key={value} value={value}>
              {evaluationResultLabels[value]}
            </option>
          ))}
        </select>
      </FormField>
      <FormField
        id="evaluation-period-start"
        label="Inicio del periodo"
        error={errors.periodStart?.message}
      >
        <input
          type="date"
          className="form-input"
          {...register("periodStart")}
        />
      </FormField>
      <FormField
        id="evaluation-period-end"
        label="Fin del periodo"
        error={errors.periodEnd?.message}
      >
        <input
          type="date"
          className="form-input"
          {...register("periodEnd")}
        />
      </FormField>
      <FormField
        id="evaluation-observations"
        label="Observaciones"
        error={errors.observations?.message}
        className="md:col-span-2"
      >
        <textarea
          className="form-input min-h-28 py-2"
          {...register("observations")}
        />
      </FormField>

      {result === "no_aplicable" && (
        <FormField
          id="evaluation-not-applicable"
          label="Justificación de no aplicabilidad"
          error={errors.notApplicableJustification?.message}
          className="md:col-span-2"
        >
          <textarea
            className="form-input min-h-28 py-2"
            {...register("notApplicableJustification")}
          />
        </FormField>
      )}

      {result === "no_conforme" && (
        <>
          <FormField
            id="evaluation-action-plan"
            label="Plan de acción"
            error={errors.actionPlan?.message}
            className="md:col-span-2"
          >
            <textarea
              className="form-input min-h-28 py-2"
              {...register("actionPlan")}
            />
          </FormField>
          <FormField
            id="evaluation-plan-responsible"
            label="Responsable del plan"
            error={errors.planResponsibleId?.message}
          >
            <select
              className="form-input"
              {...register("planResponsibleId")}
            >
              <option value="">Selecciona un responsable</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField
            id="evaluation-plan-deadline"
            label="Fecha límite del plan"
            error={errors.planDeadline?.message}
          >
            <input
              type="date"
              className="form-input"
              {...register("planDeadline")}
            />
          </FormField>
        </>
      )}

      <div className="flex flex-col gap-3 md:col-span-2 md:items-end">
        {feedback && (
          <p className="text-sm text-red-700" role="alert">
            {feedback}
          </p>
        )}
        <Button
          type="submit"
          disabled={
            isSubmitting ||
            requirements.length === 0 ||
            units.length === 0
          }
        >
          {isSubmitting ? (
            <LoaderCircle
              aria-hidden="true"
              className="size-4 animate-spin"
            />
          ) : (
            <ClipboardPlus aria-hidden="true" className="size-4" />
          )}
          Registrar evaluación
        </Button>
      </div>
    </form>
  );
}
