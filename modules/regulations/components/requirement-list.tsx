"use client";

import {
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Edit,
  LoaderCircle,
  Plus,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { StatusBadge } from "@/components/ui/status-badge";
import type { RequirementSummary } from "@/modules/regulations/types/regulation.types";
import type { ApiResponse } from "@/types/api-response";

type Editor =
  | { type: "create"; parentId: string | null }
  | { type: "edit"; requirement: RequirementSummary };

interface RequirementListProps {
  regulationId: string;
  requirements: RequirementSummary[];
  canCreate: boolean;
  canUpdate: boolean;
}

function dateInputValue(value: Date | null) {
  return value ? new Date(value).toISOString().slice(0, 10) : "";
}

export function RequirementList({
  regulationId,
  requirements,
  canCreate,
  canUpdate,
}: RequirementListProps) {
  const router = useRouter();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [editor, setEditor] = useState<Editor | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const toggleExpand = (id: string) => {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editor) return;
    setSaving(true);
    setFeedback(null);
    const form = new FormData(event.currentTarget);
    const isEdit = editor.type === "edit";
    const body = isEdit
      ? {
          description: String(form.get("description") ?? ""),
          criticality: String(form.get("criticality") ?? ""),
          validUntil: String(form.get("validUntil") ?? ""),
          active: form.get("active") === "on",
        }
      : {
          code: String(form.get("code") ?? ""),
          description: String(form.get("description") ?? ""),
          criticality: String(form.get("criticality") ?? ""),
          rootRequirementId: editor.parentId,
          validFrom: String(form.get("validFrom") ?? ""),
          validUntil: String(form.get("validUntil") ?? ""),
        };
    const url = isEdit
      ? `/api/regulations/${regulationId}/requirements/${editor.requirement.id}`
      : `/api/regulations/${regulationId}/requirements`;

    try {
      const response = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await response.json()) as ApiResponse<RequirementSummary>;
      if (!response.ok) {
        setFeedback(payload.message);
        return;
      }
      setEditor(null);
      router.refresh();
    } catch {
      setFeedback("No fue posible conectar con el servidor.");
    } finally {
      setSaving(false);
    }
  };

  const rootRequirements = requirements.filter(
    ({ rootRequirementId }) => !rootRequirementId,
  );

  const renderRequirement = (requirement: RequirementSummary, level = 0) => {
    const children = requirements.filter(
      ({ rootRequirementId }) => rootRequirementId === requirement.id,
    );
    const isExpanded = expanded.has(requirement.id);

    return (
      <div
        key={requirement.id}
        className="border-b border-slate-100 last:border-0"
      >
        <div
          className="group flex items-start gap-3 px-4 py-4 hover:bg-slate-50"
          style={{ paddingLeft: `${1 + level * 2}rem` }}
        >
          <div className="mt-0.5 flex shrink-0 items-center gap-2">
            {children.length > 0 ? (
              <button
                type="button"
                onClick={() => toggleExpand(requirement.id)}
                className="text-slate-400 hover:text-slate-700"
                aria-label={
                  isExpanded ? "Contraer requisito" : "Expandir requisito"
                }
              >
                {isExpanded ? (
                  <ChevronDown className="size-4" />
                ) : (
                  <ChevronRight className="size-4" />
                )}
              </button>
            ) : (
              <div className="w-4" />
            )}
            <StatusBadge
              tone={
                requirement.criticality === "alta"
                  ? "danger"
                  : requirement.criticality === "media"
                    ? "warning"
                    : "neutral"
              }
            >
              {requirement.code}
            </StatusBadge>
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-slate-950">
              {requirement.description}
            </p>
            <div className="mt-1 flex items-center gap-4 text-xs text-slate-500">
              <span>Versión {requirement.version}</span>
              {requirement.validUntil && (
                <span>
                  Vence:{" "}
                  {new Intl.DateTimeFormat("es-BO").format(
                    requirement.validUntil,
                  )}
                </span>
              )}
            </div>
          </div>

          {canUpdate && (
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setEditor({ type: "edit", requirement })
                }
                className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-blue-700"
                aria-label={`Editar ${requirement.code}`}
              >
                <Edit className="size-4" />
              </button>
            </div>
          )}
        </div>

        {isExpanded && children.length > 0 && (
          <div className="bg-slate-50/50">
            {children.map((child) => renderRequirement(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {canCreate && (
        <button
          type="button"
          onClick={() => setEditor({ type: "create", parentId: null })}
          className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white hover:bg-blue-800"
        >
          <Plus className="size-4" aria-hidden="true" />
          Nuevo requisito
        </button>
      )}

      {editor && (
        <form
          onSubmit={submit}
          className="grid gap-4 rounded-xl border border-blue-200 bg-blue-50/40 p-4 md:grid-cols-2"
        >
          <div className="flex items-center justify-between md:col-span-2">
            <h3 className="font-semibold text-slate-950">
              {editor.type === "edit"
                ? `Editar ${editor.requirement.code}`
                : "Nuevo requisito"}
            </h3>
            <button
              type="button"
              onClick={() => setEditor(null)}
              aria-label="Cerrar formulario"
            >
              <X className="size-5" />
            </button>
          </div>

          {editor.type === "create" && (
            <label className="grid gap-1 text-sm font-medium">
              Código
              <input name="code" required maxLength={50} className="form-input" />
            </label>
          )}
          <label className="grid gap-1 text-sm font-medium">
            Criticidad
            <select
              name="criticality"
              className="form-input"
              defaultValue={
                editor.type === "edit"
                  ? editor.requirement.criticality
                  : "media"
              }
            >
              <option value="baja">Baja</option>
              <option value="media">Media</option>
              <option value="alta">Alta</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm font-medium md:col-span-2">
            Descripción
            <textarea
              name="description"
              required
              rows={3}
              className="form-input"
              defaultValue={
                editor.type === "edit"
                  ? editor.requirement.description
                  : ""
              }
            />
          </label>
          {editor.type === "create" && (
            <label className="grid gap-1 text-sm font-medium">
              Vigente desde
              <input
                name="validFrom"
                type="date"
                required
                className="form-input"
              />
            </label>
          )}
          <label className="grid gap-1 text-sm font-medium">
            Vigente hasta (opcional)
            <input
              name="validUntil"
              type="date"
              className="form-input"
              defaultValue={
                editor.type === "edit"
                  ? dateInputValue(editor.requirement.validUntil)
                  : ""
              }
            />
          </label>
          {editor.type === "edit" && (
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                name="active"
                type="checkbox"
                defaultChecked={editor.requirement.active}
              />
              Requisito vigente
            </label>
          )}
          {feedback && (
            <p className="text-sm text-red-700 md:col-span-2" role="alert">
              {feedback}
            </p>
          )}
          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white disabled:opacity-60"
            >
              {saving && (
                <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
              )}
              Guardar requisito
            </button>
          </div>
        </form>
      )}

      {requirements.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="size-8 text-slate-400" />
          <p className="mt-2 text-sm font-medium text-slate-950">
            No hay requisitos registrados
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Esta normativa aún no tiene una estructura de requisitos definida.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-slate-200 bg-white">
          {rootRequirements.map((requirement) =>
            renderRequirement(requirement),
          )}
        </div>
      )}
    </div>
  );
}
