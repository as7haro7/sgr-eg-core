"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  CheckCircle2,
  ClipboardPlus,
  LoaderCircle,
  MessageSquareText,
  Paperclip,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { StatusBadge } from "@/components/ui/status-badge";
import type { AuditUserOption } from "@/modules/audits/types/audit.types";
import {
  findingSeverityLabels,
  findingStatusLabels,
} from "@/modules/findings/constants/finding";
import { FindingEditModal } from "@/modules/findings/components/finding-edit-modal";
import type {
  FindingRiskOption,
  FindingSummary,
} from "@/modules/findings/types/finding.types";
import {
  createFindingSchema,
  respondFindingSchema,
  type CreateFindingFormInput,
  type RespondFindingInput,
} from "@/modules/findings/validators/finding.validator";
import { EvidencePanel } from "@/modules/shared/components/evidence-panel";
import type { EvidenceSummary } from "@/modules/shared/types/evidence.types";
import type { ApiResponse } from "@/types/api-response";

interface FindingEvidence {
  findingId: string;
  items: EvidenceSummary[];
}

interface FindingPanelProps {
  auditId: string;
  canUpdate: boolean;
  evidenceByFinding: FindingEvidence[];
  findings: FindingSummary[];
  maxFileSizeBytes: number;
  riskOptions: FindingRiskOption[];
  storageConfigured: boolean;
  users: AuditUserOption[];
}

type Feedback = {
  type: "error" | "success";
  message: string;
} | null;

const severityTone = {
  baja: "success",
  media: "info",
  alta: "warning",
  critica: "danger",
} as const;

const statusTone = {
  abierto: "warning",
  en_seguimiento: "info",
  cerrado: "success",
} as const;

function formatDate(value: Date | null): string {
  if (!value) return "Sin fecha definida";

  return new Intl.DateTimeFormat("es-BO", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(value));
}




export function FindingPanel({
  auditId,
  canUpdate,
  evidenceByFinding,
  findings,
  maxFileSizeBytes,
  riskOptions,
  storageConfigured,
  users,
}: FindingPanelProps) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [responseFinding, setResponseFinding] =
    useState<FindingSummary | null>(null);
  const [closeFinding, setCloseFinding] =
    useState<FindingSummary | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [closing, setClosing] = useState(false);
  const createForm = useForm<CreateFindingFormInput>({
    resolver: zodResolver(createFindingSchema, undefined, { raw: true }),
    mode: "onChange",
    defaultValues: {
      severity: "media",
      condition: "",
      recommendation: "",
      riskId: "",
      responsibleId: "",
      deadline: "",
      requiresClosingEvidence: true,
    },
  });
  const responseForm = useForm<RespondFindingInput>({
    resolver: zodResolver(respondFindingSchema),
    mode: "onChange",
    defaultValues: { response: "" },
  });
  const severity = createForm.watch("severity");

  const closeCreateDialog = () => {
    if (createForm.formState.isSubmitting) return;
    setCreateOpen(false);
    setFeedback(null);
  };

  const submitCreate = async (input: CreateFindingFormInput) => {
    setFeedback(null);
    try {
      const response = await fetch(`/api/audits/${auditId}/findings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const payload = (await response.json()) as ApiResponse<FindingSummary>;

      if (!response.ok) {
        setFeedback({ type: "error", message: payload.message });
        return;
      }

      createForm.reset();
      setCreateOpen(false);
      router.refresh();
    } catch {
      setFeedback({
        type: "error",
        message: "No fue posible conectar con el servidor.",
      });
    }
  };

  const submitResponse = async (input: RespondFindingInput) => {
    if (!responseFinding) return;
    setFeedback(null);
    try {
      const response = await fetch(
        `/api/findings/${responseFinding.id}/response`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        },
      );
      const payload = (await response.json()) as ApiResponse<FindingSummary>;

      if (!response.ok) {
        setFeedback({ type: "error", message: payload.message });
        return;
      }

      responseForm.reset();
      setResponseFinding(null);
      router.refresh();
    } catch {
      setFeedback({
        type: "error",
        message: "No fue posible conectar con el servidor.",
      });
    }
  };

  const submitClose = async () => {
    if (!closeFinding) return;
    setClosing(true);
    setFeedback(null);
    try {
      const response = await fetch(
        `/api/findings/${closeFinding.id}/close`,
        { method: "POST" },
      );
      const payload = (await response.json()) as ApiResponse<FindingSummary>;

      if (!response.ok) {
        setFeedback({ type: "error", message: payload.message });
        return;
      }

      setCloseFinding(null);
      router.refresh();
    } catch {
      setFeedback({
        type: "error",
        message: "No fue posible conectar con el servidor.",
      });
    } finally {
      setClosing(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-950">Hallazgos</h2>
          <p className="mt-1 text-sm text-slate-600">
            Registra la condición, recomendación y seguimiento sin salir de
            la auditoría.
          </p>
        </div>
        {canUpdate && (
          <Button onClick={() => setCreateOpen(true)}>
            <ClipboardPlus aria-hidden="true" className="size-4" />
            Nuevo hallazgo
          </Button>
        )}
      </div>

      {findings.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
          Esta auditoría todavía no tiene hallazgos registrados.
        </p>
      ) : (
        <ul className="space-y-4">
          {findings.map((finding) => {
            const evidence =
              evidenceByFinding.find(
                ({ findingId }) => findingId === finding.id,
              )?.items ?? [];
            const canClose =
              !finding.requiresClosingEvidence || evidence.length > 0;

            return (
              <li
                key={finding.id}
                className="rounded-2xl border border-slate-200 p-5"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge tone={severityTone[finding.severity]}>
                      {findingSeverityLabels[finding.severity]}
                    </StatusBadge>
                    <StatusBadge tone={statusTone[finding.status]}>
                      {findingStatusLabels[finding.status]}
                    </StatusBadge>
                    {finding.requiresClosingEvidence && (
                      <StatusBadge>
                        <Paperclip aria-hidden="true" className="mr-1 size-3" />
                        Evidencia requerida
                      </StatusBadge>
                    )}
                  </div>
                  {canUpdate && finding.status !== "cerrado" && (
                    <div className="flex flex-wrap items-center gap-2">
                      <FindingEditModal
                        finding={finding}
                        users={users}
                        canUpdate={canUpdate}
                      />
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setFeedback(null);
                          responseForm.reset({
                            response: finding.response ?? "",
                          });
                          setResponseFinding(finding);
                        }}
                      >
                        <MessageSquareText
                          aria-hidden="true"
                          className="size-4"
                        />
                        {finding.response
                          ? "Actualizar respuesta"
                          : "Registrar respuesta"}
                      </Button>
                      <Button
                        variant="secondary"
                        disabled={!canClose}
                        title={
                          canClose
                            ? undefined
                            : "Debes registrar una evidencia antes de cerrar."
                        }
                        onClick={() => {
                          setFeedback(null);
                          setCloseFinding(finding);
                        }}
                      >
                        <CheckCircle2
                          aria-hidden="true"
                          className="size-4"
                        />
                        Cerrar
                      </Button>
                    </div>
                  )}
                </div>

                <dl className="mt-5 grid gap-4 md:grid-cols-2">
                  <Detail label="Condición" value={finding.condition} />
                  <Detail
                    label="Recomendación"
                    value={finding.recommendation}
                  />
                  <Detail
                    label="Responsable"
                    value={finding.responsible?.name ?? "Sin asignar"}
                  />
                  <Detail
                    label="Fecha límite"
                    value={formatDate(finding.deadline)}
                  />
                  {finding.risk && (
                    <Detail
                      label="Riesgo relacionado"
                      value={`${finding.risk.code} · ${finding.risk.title}`}
                    />
                  )}
                  {finding.response && (
                    <Detail
                      label="Respuesta"
                      value={finding.response}
                    />
                  )}
                </dl>

                <details className="mt-5 rounded-xl bg-slate-50">
                  <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">
                    Evidencias ({evidence.length})
                  </summary>
                  <div className="border-t border-slate-200 p-4">
                    <EvidencePanel
                      entityType="finding"
                      entityId={finding.id}
                      evidence={evidence}
                      canCreate={canUpdate && finding.status !== "cerrado"}
                      maxFileSizeBytes={maxFileSizeBytes}
                      storageConfigured={storageConfigured}
                    />
                  </div>
                </details>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog
        open={createOpen}
        onClose={closeCreateDialog}
        title="Registrar hallazgo"
        description="Completa la información necesaria para iniciar su seguimiento."
        width="lg"
      >
        <form
          className="grid gap-4 p-5 sm:grid-cols-2"
          onSubmit={createForm.handleSubmit(submitCreate)}
          noValidate
        >
          <FormField
            id="finding-severity"
            label="Severidad"
            error={createForm.formState.errors.severity?.message}
          >
            <select
              className="form-input"
              {...createForm.register("severity", {
                onChange: (event) => {
                  if (event.target.value === "critica") {
                    createForm.setValue(
                      "requiresClosingEvidence",
                      true,
                      { shouldValidate: true },
                    );
                  }
                },
              })}
            >
              <option value="baja">Baja</option>
              <option value="media">Media</option>
              <option value="alta">Alta</option>
              <option value="critica">Crítica</option>
            </select>
          </FormField>
          <FormField
            id="finding-responsible"
            label="Responsable"
            error={createForm.formState.errors.responsibleId?.message}
          >
            <select
              className="form-input"
              {...createForm.register("responsibleId")}
            >
              <option value="">Sin asignar</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField
            id="finding-condition"
            label="Condición encontrada"
            error={createForm.formState.errors.condition?.message}
            className="sm:col-span-2"
          >
            <textarea
              className="form-input min-h-28 py-2"
              {...createForm.register("condition")}
            />
          </FormField>
          <FormField
            id="finding-recommendation"
            label="Recomendación"
            error={createForm.formState.errors.recommendation?.message}
            className="sm:col-span-2"
          >
            <textarea
              className="form-input min-h-28 py-2"
              {...createForm.register("recommendation")}
            />
          </FormField>
          <FormField
            id="finding-risk"
            label="Riesgo relacionado"
            error={createForm.formState.errors.riskId?.message}
          >
            <select
              className="form-input"
              {...createForm.register("riskId")}
            >
              <option value="">Sin relación</option>
              {riskOptions.map((risk) => (
                <option key={risk.id} value={risk.id}>
                  {risk.code} · {risk.title}
                </option>
              ))}
            </select>
          </FormField>
          <FormField
            id="finding-deadline"
            label="Fecha límite"
            error={createForm.formState.errors.deadline?.message}
          >
            <input
              type="date"
              className="form-input"
              {...createForm.register("deadline")}
            />
          </FormField>
          <label className="flex items-start gap-3 rounded-xl bg-slate-50 p-4 sm:col-span-2">
            <input
              type="checkbox"
              className="mt-1 size-4 accent-blue-700"
              disabled={severity === "critica"}
              {...createForm.register("requiresClosingEvidence")}
            />
            <span>
              <span className="block text-sm font-semibold text-slate-800">
                Exigir evidencia para cerrar
              </span>
              <span className="mt-1 block text-xs text-slate-500">
                En severidad crítica esta protección es obligatoria.
              </span>
            </span>
          </label>
          {feedback && (
            <FeedbackMessage feedback={feedback} className="sm:col-span-2" />
          )}
          <div className="flex justify-end gap-3 sm:col-span-2">
            <Button variant="secondary" onClick={closeCreateDialog}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={createForm.formState.isSubmitting}
            >
              {createForm.formState.isSubmitting ? (
                <LoaderCircle
                  aria-hidden="true"
                  className="size-4 animate-spin"
                />
              ) : (
                <ClipboardPlus aria-hidden="true" className="size-4" />
              )}
              Registrar
            </Button>
          </div>
        </form>
      </Dialog>

      <Dialog
        open={responseFinding !== null}
        onClose={() => {
          if (responseForm.formState.isSubmitting) return;
          setResponseFinding(null);
          setFeedback(null);
        }}
        title="Registrar respuesta"
        description="La respuesta dejará el hallazgo en seguimiento."
      >
        <form
          className="space-y-4 p-5"
          onSubmit={responseForm.handleSubmit(submitResponse)}
          noValidate
        >
          <FormField
            id="finding-response"
            label="Respuesta"
            error={responseForm.formState.errors.response?.message}
          >
            <textarea
              className="form-input min-h-36 py-2"
              {...responseForm.register("response")}
            />
          </FormField>
          {feedback && <FeedbackMessage feedback={feedback} />}
          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              onClick={() => setResponseFinding(null)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={responseForm.formState.isSubmitting}
            >
              {responseForm.formState.isSubmitting && (
                <LoaderCircle
                  aria-hidden="true"
                  className="size-4 animate-spin"
                />
              )}
              Guardar respuesta
            </Button>
          </div>
        </form>
      </Dialog>

      <Dialog
        open={closeFinding !== null}
        onClose={() => {
          if (closing) return;
          setCloseFinding(null);
          setFeedback(null);
        }}
        title="Cerrar hallazgo"
        description="Esta acción registra quién realizó el cierre y su fecha."
      >
        <div className="space-y-4 p-5">
          <p className="text-sm leading-6 text-slate-700">
            ¿Confirmas que el seguimiento del hallazgo está concluido?
          </p>
          {feedback && <FeedbackMessage feedback={feedback} />}
          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              disabled={closing}
              onClick={() => setCloseFinding(null)}
            >
              Cancelar
            </Button>
            <Button disabled={closing} onClick={submitClose}>
              {closing ? (
                <LoaderCircle
                  aria-hidden="true"
                  className="size-4 animate-spin"
                />
              ) : (
                <CheckCircle2 aria-hidden="true" className="size-4" />
              )}
              Confirmar cierre
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
        {label}
      </dt>
      <dd className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-800">
        {value}
      </dd>
    </div>
  );
}

function FeedbackMessage({
  className,
  feedback,
}: {
  className?: string;
  feedback: Exclude<Feedback, null>;
}) {
  return (
    <p
      className={`${className ?? ""} ${
        feedback.type === "error" ? "text-red-700" : "text-green-700"
      } text-sm`}
      role={feedback.type === "error" ? "alert" : "status"}
    >
      {feedback.message}
    </p>
  );
}
