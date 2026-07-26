"use client";

import { Ban, Edit2, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import type { CountrySummary } from "@/modules/business-units/types/business-unit.types";
import type { ApiResponse } from "@/types/api-response";

interface OrganizationActionsProps {
  id: string;
  type: "country" | "unit" | "category";
  status: string;
  currentName: string;
  currentIsoCode?: string;
  currentCountryId?: string;
  currentCurrency?: string;
  currentDescription?: string | null;
  currentBaseAppetite?: number;
  countries?: CountrySummary[];
  canUpdate: boolean;
  canDeactivate: boolean;
}

export function OrganizationActions({
  canDeactivate,
  canUpdate,
  countries = [],
  currentBaseAppetite,
  currentCountryId,
  currentCurrency,
  currentDescription,
  currentIsoCode,
  id,
  type,
  status,
  currentName,
}: OrganizationActionsProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [dialog, setDialog] = useState<"edit" | "deactivate" | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [name, setName] = useState(currentName);
  const [isoCode, setIsoCode] = useState(currentIsoCode ?? "");
  const [countryId, setCountryId] = useState(currentCountryId ?? "");
  const [currency, setCurrency] = useState(currentCurrency ?? "");
  const [description, setDescription] = useState(currentDescription ?? "");
  const [baseAppetite, setBaseAppetite] = useState(currentBaseAppetite ?? 0);

  const endpoint =
    type === "country"
      ? `/api/countries/${id}`
      : type === "unit"
        ? `/api/business-units/${id}`
        : `/api/risk-categories/${id}`;

  const request = async (url: string, body?: unknown) => {
    setIsLoading(true);
    setFeedback(null);
    try {
      const response = await fetch(url, {
        method: body ? "PATCH" : "POST",
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const payload = (await response.json()) as ApiResponse<unknown>;
      if (!response.ok) {
        setFeedback(payload.message);
        return;
      }
      setDialog(null);
      router.refresh();
    } catch {
      setFeedback("No fue posible conectar con el servidor.");
    } finally {
      setIsLoading(false);
    }
  };

  const updateBody =
    type === "country"
      ? { name, isoCode }
      : type === "unit"
        ? { name, countryId, currency }
        : { name, description, baseAppetite };

  return (
    <>
      <div className="flex items-center gap-2">
        {canUpdate && (
          <button
            type="button"
            onClick={() => setDialog("edit")}
            aria-label={`Editar ${currentName}`}
            className="rounded p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          >
            <Edit2 aria-hidden="true" className="size-4" />
          </button>
        )}
        {canDeactivate && status === "activo" && (
          <button
            type="button"
            onClick={() => setDialog("deactivate")}
            aria-label={`Desactivar ${currentName}`}
            className="rounded p-2 text-red-600 hover:bg-red-50 hover:text-red-800"
          >
            <Ban aria-hidden="true" className="size-4" />
          </button>
        )}
      </div>

      <Dialog
        open={dialog === "edit"}
        onClose={() => setDialog(null)}
        title="Editar elemento"
        description="Modifica todos los datos configurables del registro."
      >
        <form
          className="space-y-4 p-6"
          onSubmit={(event) => {
            event.preventDefault();
            void request(endpoint, updateBody);
          }}
        >
          <Field id={`organization-${id}-name`} label="Nombre">
            <input id={`organization-${id}-name`} className="form-input" required value={name} onChange={(event) => setName(event.target.value)} />
          </Field>
          {type === "country" && (
            <Field id={`organization-${id}-iso`} label="Código ISO">
              <input id={`organization-${id}-iso`} className="form-input uppercase" required minLength={2} maxLength={2} value={isoCode} onChange={(event) => setIsoCode(event.target.value)} />
            </Field>
          )}
          {type === "unit" && (
            <>
              <Field id={`organization-${id}-country`} label="País">
                <select id={`organization-${id}-country`} className="form-input" required value={countryId} onChange={(event) => setCountryId(event.target.value)}>
                  {countries.filter(({ status: countryStatus }) => countryStatus === "activo").map((country) => (
                    <option key={country.id} value={country.id}>{country.name}</option>
                  ))}
                </select>
              </Field>
              <Field id={`organization-${id}-currency`} label="Moneda ISO">
                <input id={`organization-${id}-currency`} className="form-input uppercase" required minLength={3} maxLength={3} value={currency} onChange={(event) => setCurrency(event.target.value)} />
              </Field>
            </>
          )}
          {type === "category" && (
            <>
              <Field id={`organization-${id}-description`} label="Descripción">
                <textarea id={`organization-${id}-description`} className="form-input min-h-20" value={description} onChange={(event) => setDescription(event.target.value)} />
              </Field>
              <Field id={`organization-${id}-appetite`} label="Apetito base (0–25)">
                <input id={`organization-${id}-appetite`} type="number" min={0} max={25} step="0.01" className="form-input" value={baseAppetite} onChange={(event) => setBaseAppetite(Number(event.target.value))} />
              </Field>
            </>
          )}
          <Feedback message={feedback} />
          <Button type="submit" disabled={isLoading}>
            {isLoading && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}
            Guardar cambios
          </Button>
        </form>
      </Dialog>

      <Dialog
        open={dialog === "deactivate"}
        onClose={() => setDialog(null)}
        title="Confirmar desactivación"
        description={`El registro ${currentName} dejará de estar disponible para nuevas operaciones.`}
      >
        <div className="space-y-4 p-6">
          <Feedback message={feedback} />
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setDialog(null)}>Cancelar</Button>
            <Button variant="danger" onClick={() => void request(`${endpoint}/deactivate`)} disabled={isLoading}>
              {isLoading && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}
              Desactivar
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}

function Field({ children, id, label }: { children: React.ReactNode; id: string; label: string }) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-medium">{label}</label>
      {children}
    </div>
  );
}

function Feedback({ message }: { message: string | null }) {
  return message ? <p className="text-sm text-red-700" role="alert">{message}</p> : null;
}
