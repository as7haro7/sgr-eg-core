"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  Download,
  ExternalLink,
  FileText,
  Link2,
  LoaderCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import type { EvidenceEntityType } from "@/modules/shared/constants/evidence";
import { EvidenceUploader } from "@/modules/shared/components/evidence-uploader";
import type { EvidenceSummary } from "@/modules/shared/types/evidence.types";
import {
  createLinkEvidenceSchema,
  type CreateLinkEvidenceInput,
} from "@/modules/shared/validators/evidence.validator";
import type { ApiResponse } from "@/types/api-response";

interface EvidencePanelProps {
  entityType: EvidenceEntityType;
  entityId: string;
  evidence: EvidenceSummary[];
  canCreate: boolean;
  maxFileSizeBytes: number;
  storageConfigured: boolean;
}

function formatBytes(value: string): string {
  const bytes = Number(value);

  if (!Number.isSafeInteger(bytes) || bytes < 0) return `${value} bytes`;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KiB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MiB`;
}

export function EvidencePanel({
  canCreate,
  entityId,
  entityType,
  evidence,
  maxFileSizeBytes,
  storageConfigured,
}: EvidencePanelProps) {
  const router = useRouter();
  const fieldPrefix = `evidence-${entityType}-${entityId}`;
  const [feedback, setFeedback] = useState<{
    type: "error" | "success";
    message: string;
  } | null>(null);
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
  } = useForm<CreateLinkEvidenceInput>({
    resolver: zodResolver(createLinkEvidenceSchema),
    mode: "onChange",
    defaultValues: {
      entityType,
      entityId,
      name: "",
      referenceUrl: "",
    },
  });

  const submit = async (input: CreateLinkEvidenceInput) => {
    setFeedback(null);

    try {
      const response = await fetch("/api/evidence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const payload = (await response.json()) as ApiResponse<EvidenceSummary>;

      setFeedback({
        type: response.ok ? "success" : "error",
        message: payload.message,
      });

      if (response.ok) {
        reset({ entityType, entityId, name: "", referenceUrl: "" });
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
    <div className="space-y-4">
      {canCreate && (
        <div className="grid gap-4 xl:grid-cols-2">
          {storageConfigured ? (
            <EvidenceUploader
              entityType={entityType}
              entityId={entityId}
              maxFileSizeBytes={maxFileSizeBytes}
            />
          ) : (
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
              La carga de archivos estará disponible cuando se configure el
              bucket privado de Supabase Storage. Los enlaces pueden
              registrarse normalmente.
            </div>
          )}

          <form
            className="grid gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-2"
            onSubmit={handleSubmit(submit)}
            noValidate
          >
            <FormField
              id={`${fieldPrefix}-name`}
              label="Nombre del enlace"
              error={errors.name?.message}
            >
              <input
                id={`${fieldPrefix}-name`}
                className="form-input"
                {...register("name")}
              />
            </FormField>
            <FormField
              id={`${fieldPrefix}-url`}
              label="Dirección del enlace"
              error={errors.referenceUrl?.message}
            >
              <input
                id={`${fieldPrefix}-url`}
                type="url"
                className="form-input"
                {...register("referenceUrl")}
              />
            </FormField>
            <div className="flex flex-col items-start gap-3 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between">
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
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <LoaderCircle
                    aria-hidden="true"
                    className="size-4 animate-spin"
                  />
                ) : (
                  <Link2 aria-hidden="true" className="size-4" />
                )}
                Registrar enlace
              </Button>
            </div>
          </form>
        </div>
      )}

      <ul className="grid gap-3 md:grid-cols-2">
        {evidence.map((item) => {
          const isFile = item.type === "archivo";
          const ActionIcon = isFile ? Download : ExternalLink;

          return (
            <li
              key={item.id}
              className="rounded-xl border border-slate-200 p-4"
            >
              <div className="flex items-start gap-3">
                {isFile ? (
                  <FileText
                    aria-hidden="true"
                    className="mt-0.5 size-5 text-blue-700"
                  />
                ) : (
                  <Link2
                    aria-hidden="true"
                    className="mt-0.5 size-5 text-blue-700"
                  />
                )}
                <div className="min-w-0">
                  <a
                    href={item.referenceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-semibold text-slate-950 hover:text-blue-700 hover:underline"
                  >
                    <span className="break-all">{item.name}</span>
                    <ActionIcon
                      aria-hidden="true"
                      className="size-3 shrink-0"
                    />
                  </a>
                  <p className="mt-1 text-xs text-slate-500">
                    {isFile ? "Archivo" : "Enlace"} · {item.author.name}
                    {item.sizeBytes
                      ? ` · ${formatBytes(item.sizeBytes)}`
                      : ""}
                  </p>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {evidence.length === 0 && (
        <p className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500">
          No existen evidencias registradas.
        </p>
      )}
    </div>
  );
}
