"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ExternalLink, FileText, Link2, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import type { EvidenceEntityType } from "@/modules/shared/constants/evidence";
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
}

export function EvidencePanel({
  canCreate,
  entityId,
  entityType,
  evidence,
}: EvidencePanelProps) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
  } = useForm<CreateLinkEvidenceInput>({
    resolver: zodResolver(createLinkEvidenceSchema),
    defaultValues: {
      entityType,
      entityId,
      name: "",
      referenceUrl: "",
    },
  });

  const submit = async (input: CreateLinkEvidenceInput) => {
    try {
      const response = await fetch("/api/evidence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const payload = (await response.json()) as ApiResponse<EvidenceSummary>;
      setMessage(payload.message);

      if (response.ok) {
        reset({ entityType, entityId, name: "", referenceUrl: "" });
        router.refresh();
      }
    } catch {
      setMessage("No fue posible conectar con el servidor.");
    }
  };

  return (
    <div className="space-y-4">
      {canCreate && (
        <form
          className="grid gap-3 rounded-xl bg-slate-50 p-4 md:grid-cols-[1fr_2fr_auto] dark:bg-slate-950/40"
          onSubmit={handleSubmit(submit)}
        >
          <label className="space-y-2 text-sm font-medium">
            <span>Nombre</span>
            <input className="form-input" {...register("name")} />
            {errors.name && <span className="block text-red-600">{errors.name.message}</span>}
          </label>
          <label className="space-y-2 text-sm font-medium">
            <span>Enlace</span>
            <input type="url" className="form-input" {...register("referenceUrl")} />
            {errors.referenceUrl && <span className="block text-red-600">{errors.referenceUrl.message}</span>}
          </label>
          <div className="flex items-end">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <LoaderCircle className="size-4 animate-spin" /> : <Link2 className="size-4" />}
              Registrar enlace
            </Button>
          </div>
          {message && <p className="text-sm md:col-span-full">{message}</p>}
        </form>
      )}
      <ul className="grid gap-3 md:grid-cols-2">
        {evidence.map((item) => (
          <li key={item.id} className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
            <div className="flex items-start gap-3">
              {item.type === "archivo" ? <FileText className="mt-0.5 size-5" /> : <Link2 className="mt-0.5 size-5" />}
              <div className="min-w-0">
                <a
                  href={item.referenceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-semibold hover:underline"
                >
                  {item.name}
                  <ExternalLink className="size-3" />
                </a>
                <p className="mt-1 text-xs text-slate-500">
                  {item.type} · {item.author.name}
                  {item.sizeBytes ? ` · ${item.sizeBytes} bytes` : ""}
                </p>
              </div>
            </div>
          </li>
        ))}
      </ul>
      {evidence.length === 0 && (
        <p className="rounded-lg border border-dashed p-4 text-sm text-slate-500">
          No existen evidencias registradas.
        </p>
      )}
    </div>
  );
}
