"use client";

import { FileUp, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  type FormEvent,
  useId,
  useState,
} from "react";

import { Button } from "@/components/ui/button";
import type { EvidenceEntityType } from "@/modules/shared/constants/evidence";
import type { EvidenceSummary } from "@/modules/shared/types/evidence.types";
import type { ApiResponse } from "@/types/api-response";

interface EvidenceUploaderProps {
  entityId: string;
  entityType: EvidenceEntityType;
  maxFileSizeBytes: number;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KiB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MiB`;
}

export function EvidenceUploader({
  entityId,
  entityType,
  maxFileSizeBytes,
}: EvidenceUploaderProps) {
  const inputId = useId();
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "error" | "success";
    message: string;
  } | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);

    if (!file) {
      setFeedback({
        type: "error",
        message: "Debes seleccionar un archivo.",
      });
      return;
    }

    if (file.size > maxFileSizeBytes) {
      setFeedback({
        type: "error",
        message: `El archivo supera el límite de ${formatBytes(maxFileSizeBytes)}.`,
      });
      return;
    }

    const form = event.currentTarget;
    const data = new FormData();
    data.set("entityType", entityType);
    data.set("entityId", entityId);
    data.set("file", file);
    setIsUploading(true);

    try {
      const response = await fetch("/api/evidence/upload", {
        method: "POST",
        body: data,
      });
      const payload = (await response.json()) as ApiResponse<EvidenceSummary>;

      setFeedback({
        type: response.ok ? "success" : "error",
        message: payload.message,
      });

      if (response.ok) {
        form.reset();
        setFile(null);
        router.refresh();
      }
    } catch {
      setFeedback({
        type: "error",
        message: "No fue posible conectar con el servidor.",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <form
      className="rounded-xl border border-dashed border-blue-300 bg-blue-50/50 p-4"
      onSubmit={submit}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1">
          <label
            htmlFor={inputId}
            className="text-sm font-semibold text-slate-800"
          >
            Archivo de evidencia
          </label>
          <input
            id={inputId}
            type="file"
            className="mt-2 block w-full cursor-pointer rounded-lg border border-slate-300 bg-white text-sm text-slate-700 file:mr-3 file:min-h-11 file:border-0 file:border-r file:border-slate-200 file:bg-slate-50 file:px-3 file:text-sm file:font-semibold hover:file:bg-slate-100"
            onChange={(event) => {
              setFile(event.target.files?.[0] ?? null);
              setFeedback(null);
            }}
            aria-describedby={`${inputId}-hint`}
          />
          <p id={`${inputId}-hint`} className="mt-2 text-xs text-slate-600">
            Máximo {formatBytes(maxFileSizeBytes)}. No se permiten archivos
            ejecutables ni scripts.
          </p>
        </div>
        <Button type="submit" disabled={isUploading || !file}>
          {isUploading ? (
            <LoaderCircle
              aria-hidden="true"
              className="size-4 animate-spin"
            />
          ) : (
            <FileUp aria-hidden="true" className="size-4" />
          )}
          {isUploading ? "Cargando…" : "Cargar archivo"}
        </Button>
      </div>
      {feedback && (
        <p
          className={
            feedback.type === "error"
              ? "mt-3 text-sm text-red-700"
              : "mt-3 text-sm text-green-700"
          }
          role={feedback.type === "error" ? "alert" : "status"}
        >
          {feedback.message}
        </p>
      )}
    </form>
  );
}
