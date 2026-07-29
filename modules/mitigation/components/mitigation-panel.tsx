"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import {
  mitigationStatuses,
  mitigationStatusLabels,
} from "@/modules/mitigation/constants/mitigation";
import type {
  MitigationActionSummary,
  MitigationPlanSummary,
} from "@/modules/mitigation/types/mitigation.types";
import {
  createMitigationPlanSchema,
  mitigationEditorSchema,
  type CreateMitigationPlanFormInput,
  type MitigationEditorFormInput,
} from "@/modules/mitigation/validators/mitigation.validator";
import type { RiskOwnerOption } from "@/modules/risks/types/risk.types";
import type { ApiResponse } from "@/types/api-response";
import { EvidencePanel } from "@/modules/shared/components/evidence-panel";
import type { EvidenceSummary } from "@/modules/shared/types/evidence.types";

interface MitigationPanelProps {
  riskId: string;
  plans: MitigationPlanSummary[];
  owners: RiskOwnerOption[];
  canCreate: boolean;
  canUpdate: boolean;
  canDeactivate: boolean;
  evidenceByEntityId: Record<string, EvidenceSummary[]>;
  maxEvidenceFileSize: number;
  storageConfigured: boolean;
}

export function MitigationPanel({
  canCreate,
  canDeactivate,
  canUpdate,
  evidenceByEntityId,
  maxEvidenceFileSize,
  owners,
  plans,
  riskId,
  storageConfigured,
}: MitigationPanelProps) {
  return (
    <section className="space-y-6">
      {canCreate && (
        <MitigationCreateForm
          endpoint={`/api/risks/${riskId}/mitigation-plans`}
          label="Crear plan"
          owners={owners}
        />
      )}
      <div className="space-y-5">
        {plans.map((plan) => (
          <article
            key={plan.id}
            className="rounded-xl border border-slate-200 p-4 dark:border-slate-800"
          >
            <h3 className="mb-3 font-bold">Plan de mitigación</h3>
            <MitigationEditor
              endpoint={`/api/mitigation-plans/${plan.id}`}
              entity={plan}
              owners={owners}
              disabled={!canUpdate}
              canDeactivate={canDeactivate}
            />
            <EvidenceSection
              entityType="plan"
              entityId={plan.id}
              evidence={evidenceByEntityId[plan.id] ?? []}
              canCreate={canUpdate}
              maxFileSizeBytes={maxEvidenceFileSize}
              storageConfigured={storageConfigured}
            />
            <div className="mt-5 border-t border-slate-200 pt-4 dark:border-slate-800">
              <h4 className="mb-3 text-sm font-bold uppercase text-slate-500">
                Acciones
              </h4>
              <div className="space-y-3">
                {plan.actions.map((action) => (
                  <div key={action.id} className="rounded-lg border p-3 dark:border-slate-800">
                    <MitigationEditor
                      endpoint={`/api/mitigation-actions/${action.id}`}
                      entity={action}
                      owners={owners}
                      disabled={!canUpdate}
                      canDeactivate={canDeactivate}
                      compact
                    />
                    <EvidenceSection
                      entityType="action"
                      entityId={action.id}
                      evidence={evidenceByEntityId[action.id] ?? []}
                      canCreate={canUpdate}
                      maxFileSizeBytes={maxEvidenceFileSize}
                      storageConfigured={storageConfigured}
                    />
                  </div>
                ))}
              </div>
              {canCreate && (
                <div className="mt-4">
                  <MitigationCreateForm
                    endpoint={`/api/mitigation-plans/${plan.id}/actions`}
                    label="Agregar acción"
                    owners={owners}
                    compact
                  />
                </div>
              )}
            </div>
          </article>
        ))}
      </div>
      {plans.length === 0 && (
        <p className="rounded-lg border border-dashed p-4 text-sm text-slate-500">
          No existen planes de mitigación.
        </p>
      )}
    </section>
  );
}

function MitigationCreateForm({
  compact = false,
  endpoint,
  label,
  owners,
}: {
  compact?: boolean;
  endpoint: string;
  label: string;
  owners: RiskOwnerOption[];
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
  } = useForm<CreateMitigationPlanFormInput>({
    resolver: zodResolver(createMitigationPlanSchema, undefined, { raw: true }),
    defaultValues: {
      description: "",
      responsibleId: "",
      dueDate: "",
      progress: 0,
    },
  });

  const submit = async (input: CreateMitigationPlanFormInput) => {
    const result = await send(endpoint, "POST", input);
    setMessage(result.message);
    if (result.ok) {
      reset();
      router.refresh();
    }
  };

  return (
    <form
      className={`grid gap-3 rounded-xl bg-slate-50 p-4 dark:bg-slate-950/40 ${
        compact ? "md:grid-cols-5" : "md:grid-cols-4"
      }`}
      onSubmit={handleSubmit(submit)}
    >
      <Field label="Descripción" error={errors.description?.message}>
        <input className="form-input" {...register("description")} />
      </Field>
      <Field label="Responsable" error={errors.responsibleId?.message}>
        <select className="form-input" {...register("responsibleId")}>
          <option value="">Seleccionar</option>
          {owners.map((owner) => (
            <option key={owner.id} value={owner.id}>{owner.name}</option>
          ))}
        </select>
      </Field>
      <Field label="Fecha límite" error={errors.dueDate?.message}>
        <input type="date" className="form-input" {...register("dueDate")} />
      </Field>
      <Field label="Avance (%)" error={errors.progress?.message}>
        <input type="number" min="0" max="100" step="0.01" className="form-input" {...register("progress")} />
      </Field>
      <div className="flex items-end">
        <Button type="submit" disabled={isSubmitting || owners.length === 0}>
          {isSubmitting && <LoaderCircle className="size-4 animate-spin" />}
          {label}
        </Button>
      </div>
      {message && <p className="text-sm md:col-span-full">{message}</p>}
    </form>
  );
}

function MitigationEditor({
  compact = false,
  canDeactivate,
  disabled,
  endpoint,
  entity,
  owners,
}: {
  compact?: boolean;
  canDeactivate: boolean;
  disabled: boolean;
  endpoint: string;
  entity: MitigationPlanSummary | MitigationActionSummary;
  owners: RiskOwnerOption[];
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const editorOwners = owners.some(({ id }) => id === entity.responsible.id)
    ? owners
    : [entity.responsible, ...owners];
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
  } = useForm<MitigationEditorFormInput>({
    resolver: zodResolver(mitigationEditorSchema, undefined, { raw: true }),
    defaultValues: {
      description: entity.description,
      responsibleId: entity.responsible.id,
      dueDate: toDateInput(entity.dueDate),
      progress: entity.progress,
      status: entity.status,
    },
  });

  const submit = async (input: MitigationEditorFormInput) => {
    const result = await send(endpoint, "PATCH", input);
    setMessage(result.message);
    if (result.ok) router.refresh();
  };

  const deactivate = async () => {
    setIsDeactivating(true);
    const result = await send(`${endpoint}/deactivate`, "POST");
    setMessage(result.message);
    setIsDeactivating(false);
    setConfirmDeactivate(false);
    if (result.ok) router.refresh();
  };

  return (
    <>
      <form
        className={`grid gap-3 ${compact ? "md:grid-cols-6" : "md:grid-cols-5"}`}
        onSubmit={handleSubmit(submit)}
      >
        <Field label="Descripción" error={errors.description?.message}>
          <input className="form-input" disabled={disabled} {...register("description")} />
        </Field>
        <Field label="Responsable" error={errors.responsibleId?.message}>
          <select className="form-input" disabled={disabled} {...register("responsibleId")}>
            {editorOwners.map((owner) => (
              <option key={owner.id} value={owner.id}>{owner.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Fecha límite" error={errors.dueDate?.message}>
          <input type="date" className="form-input" disabled={disabled} {...register("dueDate")} />
        </Field>
        <Field label="Avance (%)" error={errors.progress?.message}>
          <input type="number" min="0" max="100" step="0.01" className="form-input" disabled={disabled} {...register("progress")} />
        </Field>
        <Field label="Estado" error={errors.status?.message}>
          <select className="form-input" disabled={disabled} {...register("status")}>
            {mitigationStatuses.map((status) => (
              <option key={status} value={status}>{mitigationStatusLabels[status]}</option>
            ))}
          </select>
        </Field>
        <div className="flex flex-wrap items-end gap-2">
          {!disabled && (
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}
              Guardar
            </Button>
          )}
          {canDeactivate && entity.status === "activo" && (
            <Button variant="danger" onClick={() => setConfirmDeactivate(true)}>
              Retirar
            </Button>
          )}
        </div>
        {message && (
          <p aria-live="polite" className="text-sm md:col-span-full">
            {message}
          </p>
        )}
      </form>
      <Dialog
        open={confirmDeactivate}
        onClose={() => setConfirmDeactivate(false)}
        title={compact ? "Retirar acción" : "Retirar plan"}
        description="El elemento quedará cancelado y dejará de considerarse activo."
      >
        <div className="flex justify-end gap-2">
          <Button
            variant="secondary"
            disabled={isDeactivating}
            onClick={() => setConfirmDeactivate(false)}
          >
            Cancelar
          </Button>
          <Button variant="danger" disabled={isDeactivating} onClick={deactivate}>
            {isDeactivating && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}
            Confirmar retiro
          </Button>
        </div>
      </Dialog>
    </>
  );
}

function EvidenceSection({
  canCreate,
  entityId,
  entityType,
  evidence,
  maxFileSizeBytes,
  storageConfigured,
}: {
  canCreate: boolean;
  entityId: string;
  entityType: "plan" | "action";
  evidence: EvidenceSummary[];
  maxFileSizeBytes: number;
  storageConfigured: boolean;
}) {
  return (
    <details className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-800">
      <summary className="cursor-pointer text-sm font-semibold">
        Evidencias ({evidence.length})
      </summary>
      <div className="mt-4">
        <EvidencePanel
          entityType={entityType}
          entityId={entityId}
          evidence={evidence}
          canCreate={canCreate}
          maxFileSizeBytes={maxFileSizeBytes}
          storageConfigured={storageConfigured}
        />
      </div>
    </details>
  );
}

async function send(url: string, method: "PATCH" | "POST", body?: unknown) {
  try {
    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const payload =
      (await response.json()) as ApiResponse<MitigationPlanSummary[]>;
    return { ok: response.ok, message: payload.message };
  } catch {
    return { ok: false, message: "No fue posible conectar con el servidor." };
  }
}

function Field({ children, error, label }: { children: React.ReactNode; error?: string; label: string }) {
  return (
    <label className="space-y-2 text-sm font-medium">
      <span>{label}</span>
      {children}
      {error && <span className="block text-red-600">{error}</span>}
    </label>
  );
}

function toDateInput(date: Date | string) {
  return new Date(date).toISOString().slice(0, 10);
}
