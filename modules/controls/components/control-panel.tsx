"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { History, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
  controlTypeLabels,
  controlTypes,
} from "@/modules/controls/constants/control";
import type {
  ControlHistoryEntry,
  ControlSummary,
  RiskControlOverview,
} from "@/modules/controls/types/control.types";
import {
  controlEditorSchema,
  createControlSchema,
  type ControlEditorInput,
  type CreateControlInput,
} from "@/modules/controls/validators/control.validator";
import type { ApiResponse } from "@/types/api-response";

interface ControlPanelProps {
  riskId: string;
  overview: RiskControlOverview;
  canCreate: boolean;
  canUpdate: boolean;
  canDeactivate: boolean;
}

export function ControlPanel({
  canCreate,
  canDeactivate,
  canUpdate,
  overview,
  riskId,
}: ControlPanelProps) {
  return (
    <section className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Metric label="Residual" value={overview.residualLevel} />
        <Metric label="Apetito vigente" value={overview.appetiteThreshold} />
        <div
          className={`rounded-xl p-4 ${
            overview.exceedsAppetite
              ? "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-200"
              : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"
          }`}
        >
          <p className="text-xs font-semibold uppercase">Comparación</p>
          <p className="mt-2 font-bold">
            {overview.exceedsAppetite
              ? "Supera el apetito"
              : "Dentro del apetito"}
          </p>
        </div>
      </div>

      {canCreate && <CreateControlForm riskId={riskId} />}

      <div className="grid gap-4 lg:grid-cols-2">
        {overview.controls.map((control) => (
          <ControlCard
            key={control.id}
            control={control}
            canUpdate={canUpdate}
            canDeactivate={canDeactivate}
          />
        ))}
      </div>
      {overview.controls.length === 0 && (
        <p className="rounded-lg border border-dashed p-4 text-sm text-slate-500">
          No existen controles registrados.
        </p>
      )}
    </section>
  );
}

function CreateControlForm({ riskId }: { riskId: string }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
  } = useForm<CreateControlInput>({
    resolver: zodResolver(createControlSchema),
    defaultValues: {
      description: "",
      type: "preventivo",
      effectiveness: 0,
      isKey: false,
    },
  });

  const onSubmit = async (input: CreateControlInput) => {
    const result = await sendRequest(
      `/api/risks/${riskId}/controls`,
      "POST",
      input,
    );
    setMessage(result.message);
    if (result.ok) {
      reset();
      router.refresh();
    }
  };

  return (
    <form
      className="grid gap-3 rounded-xl border border-slate-200 p-4 md:grid-cols-4 dark:border-slate-800"
      onSubmit={handleSubmit(onSubmit)}
    >
      <Field label="Descripción" error={errors.description?.message}>
        <input className="form-input" {...register("description")} />
      </Field>
      <Field label="Tipo" error={errors.type?.message}>
        <select className="form-input" {...register("type")}>
          {controlTypes.map((type) => (
            <option key={type} value={type}>{controlTypeLabels[type]}</option>
          ))}
        </select>
      </Field>
      <Field label="Efectividad (%)" error={errors.effectiveness?.message}>
        <input type="number" min="0" max="100" step="0.01" className="form-input" {...register("effectiveness")} />
      </Field>
      <div className="flex items-end gap-3">
        <label className="flex h-10 items-center gap-2 text-sm">
          <input type="checkbox" {...register("isKey")} />
          Control clave
        </label>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <LoaderCircle className="size-4 animate-spin" />}
          Agregar
        </Button>
      </div>
      {message && <p className="text-sm md:col-span-4">{message}</p>}
    </form>
  );
}

function ControlCard({
  canDeactivate,
  canUpdate,
  control,
}: {
  canDeactivate: boolean;
  canUpdate: boolean;
  control: ControlSummary;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [history, setHistory] = useState<ControlHistoryEntry[] | null>(null);
  const {
    formState: { isSubmitting },
    handleSubmit,
    register,
  } = useForm<ControlEditorInput>({
    resolver: zodResolver(controlEditorSchema),
    defaultValues: {
      description: control.description,
      type: control.type,
      effectiveness: control.effectiveness,
      isKey: control.isKey,
      status: control.status,
    },
  });

  const update = async (input: ControlEditorInput) => {
    const result = await sendRequest(`/api/controls/${control.id}`, "PATCH", input);
    setMessage(result.message);
    if (result.ok) router.refresh();
  };

  const deactivate = async () => {
    const result = await sendRequest(`/api/controls/${control.id}/deactivate`, "POST");
    setMessage(result.message);
    if (result.ok) router.refresh();
  };

  const loadHistory = async () => {
    const response = await fetch(`/api/controls/${control.id}/history`);
    const payload = (await response.json()) as ApiResponse<ControlHistoryEntry[]>;
    setMessage(payload.message);
    if (response.ok) setHistory(payload.data ?? []);
  };

  return (
    <article className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
      <form className="space-y-3" onSubmit={handleSubmit(update)}>
        <input className="form-input" disabled={!canUpdate} {...register("description")} />
        <div className="grid grid-cols-2 gap-3">
          <select className="form-input" disabled={!canUpdate} {...register("type")}>
            {controlTypes.map((type) => (
              <option key={type} value={type}>{controlTypeLabels[type]}</option>
            ))}
          </select>
          <input type="number" min="0" max="100" step="0.01" className="form-input" disabled={!canUpdate} {...register("effectiveness")} />
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" disabled={!canUpdate} {...register("isKey")} />
            Clave
          </label>
          <select className="form-input w-auto" disabled={!canUpdate} {...register("status")}>
            <option value="activo">Activo</option>
            <option value="inactivo">Inactivo</option>
          </select>
          {canUpdate && (
            <Button type="submit" disabled={isSubmitting}>Guardar</Button>
          )}
          <button type="button" className="inline-flex items-center gap-1 text-sm font-medium" onClick={loadHistory}>
            <History className="size-4" /> Historial
          </button>
          {canDeactivate && (
            <button type="button" className="text-sm font-medium text-red-600" onClick={deactivate}>
              Retirar
            </button>
          )}
        </div>
      </form>
      {message && <p className="mt-3 text-sm text-slate-500">{message}</p>}
      {history && (
        <ul className="mt-3 space-y-2 border-t pt-3 text-xs">
          {history.map((entry) => (
            <li key={entry.id}>
              {entry.actor?.name ?? "Sistema"} · {formatDate(entry.date)}:
              {" "}{entry.previous.effectiveness}% → {entry.current.effectiveness}%,
              {" "}{entry.previous.status} → {entry.current.status},
              {" "}clave {String(entry.previous.isKey)} → {String(entry.current.isKey)}
            </li>
          ))}
          {history.length === 0 && <li>Sin cambios relevantes.</li>}
        </ul>
      )}
    </article>
  );
}

async function sendRequest(
  url: string,
  method: "PATCH" | "POST",
  body?: unknown,
) {
  try {
    const response = await fetch(url, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const payload = (await response.json()) as ApiResponse<unknown>;
    return { ok: response.ok, message: payload.message };
  } catch {
    return { ok: false, message: "No fue posible conectar con el servidor." };
  }
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-slate-100 p-4 dark:bg-slate-800">
      <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
      <p className="mt-2 font-mono text-2xl font-bold">{value}</p>
    </div>
  );
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

function formatDate(date: Date | string) {
  return new Intl.DateTimeFormat("es-BO", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/La_Paz",
  }).format(new Date(date));
}
