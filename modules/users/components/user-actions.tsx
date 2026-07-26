"use client";

import { Ban, Edit2, KeyRound, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import type { BusinessUnitOption } from "@/modules/business-units/types/business-unit.types";
import type { RoleOption } from "@/modules/roles/types/role.types";
import type { UserSummary } from "@/modules/users/types/user.types";
import type { ApiResponse } from "@/types/api-response";

interface UserActionsProps {
  user: UserSummary;
  roles: RoleOption[];
  units: BusinessUnitOption[];
  canUpdate: boolean;
  canDeactivate: boolean;
}

type ActiveDialog = "edit" | "password" | "deactivate" | null;

export function UserActions({
  canDeactivate,
  canUpdate,
  roles,
  units,
  user,
}: UserActionsProps) {
  const router = useRouter();
  const [dialog, setDialog] = useState<ActiveDialog>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [roleIds, setRoleIds] = useState(user.roles.map(({ id }) => id));
  const [selectedUnits, setSelectedUnits] = useState(
    user.units.map(({ id, isPrimary }) => ({ unitId: id, isPrimary })),
  );
  const [password, setPassword] = useState("");

  const close = () => {
    setDialog(null);
    setFeedback(null);
    setPassword("");
  };

  const request = async (
    url: string,
    method: "PATCH" | "POST",
    body?: unknown,
  ) => {
    setIsLoading(true);
    setFeedback(null);
    try {
      const response = await fetch(url, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const payload = (await response.json()) as ApiResponse<unknown>;
      if (!response.ok) {
        setFeedback(payload.message);
        return false;
      }
      close();
      router.refresh();
      return true;
    } catch {
      setFeedback("No fue posible conectar con el servidor.");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const toggleRole = (roleId: string) => {
    setRoleIds((current) =>
      current.includes(roleId)
        ? current.filter((id) => id !== roleId)
        : [...current, roleId],
    );
  };

  const toggleUnit = (unitId: string) => {
    setSelectedUnits((current) =>
      current.some((unit) => unit.unitId === unitId)
        ? current.filter((unit) => unit.unitId !== unitId)
        : [...current, { unitId, isPrimary: false }],
    );
  };

  const setPrimaryUnit = (unitId: string) => {
    setSelectedUnits((current) =>
      current.map((unit) => ({
        ...unit,
        isPrimary: unit.unitId === unitId,
      })),
    );
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-end gap-2">
        {canUpdate && (
          <>
            <button
              type="button"
              onClick={() => setDialog("edit")}
              aria-label={`Editar a ${user.name}`}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            >
              <Edit2 aria-hidden="true" className="size-4" />
              <span className="hidden xl:inline">Editar</span>
            </button>
            <button
              type="button"
              onClick={() => setDialog("password")}
              aria-label={`Restablecer contraseña de ${user.name}`}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            >
              <KeyRound aria-hidden="true" className="size-4" />
              <span className="hidden xl:inline">Clave</span>
            </button>
          </>
        )}
        {canDeactivate && user.status === "activo" && (
          <button
            type="button"
            onClick={() => setDialog("deactivate")}
            aria-label={`Desactivar a ${user.name}`}
            className="inline-flex size-10 items-center justify-center rounded-lg border border-red-100 text-red-600 hover:bg-red-50 hover:text-red-800"
          >
            <Ban aria-hidden="true" className="size-4" />
          </button>
        )}
      </div>

      <Dialog
        open={dialog === "edit"}
        onClose={close}
        title="Editar usuario"
        description="Actualiza identidad, roles y alcance por unidades."
        width="lg"
      >
        <form
          className="grid gap-5 p-6 md:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            void request(`/api/users/${user.id}`, "PATCH", {
              name,
              email,
              roleIds,
              units: selectedUnits,
            });
          }}
        >
          <Field id={`user-${user.id}-name`} label="Nombre">
            <input
              id={`user-${user.id}-name`}
              className="form-input"
              required
              maxLength={150}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </Field>
          <Field id={`user-${user.id}-email`} label="Correo electrónico">
            <input
              id={`user-${user.id}-email`}
              type="email"
              className="form-input"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </Field>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Roles</legend>
            <div className="space-y-2 rounded-lg border p-3">
              {roles.map((role) => (
                <label key={role.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={roleIds.includes(role.id)}
                    onChange={() => toggleRole(role.id)}
                  />
                  {role.name}
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Unidades</legend>
            <div className="space-y-2 rounded-lg border p-3">
              {units.map((unit) => {
                const selected = selectedUnits.find(
                  ({ unitId }) => unitId === unit.id,
                );
                return (
                  <div key={unit.id} className="flex justify-between gap-3 text-sm">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={Boolean(selected)}
                        onChange={() => toggleUnit(unit.id)}
                      />
                      {unit.name}
                    </label>
                    <label className="flex items-center gap-1 text-xs">
                      <input
                        type="radio"
                        name={`primary-${user.id}`}
                        disabled={!selected}
                        checked={selected?.isPrimary ?? false}
                        onChange={() => setPrimaryUnit(unit.id)}
                      />
                      Principal
                    </label>
                  </div>
                );
              })}
            </div>
          </fieldset>
          <Feedback message={feedback} />
          <div className="md:col-span-2">
            <SubmitButton isLoading={isLoading}>Guardar cambios</SubmitButton>
          </div>
        </form>
      </Dialog>

      <Dialog
        open={dialog === "password"}
        onClose={close}
        title="Restablecer contraseña"
        description="Las sesiones activas se revocarán y se exigirá cambiarla al ingresar."
      >
        <form
          className="space-y-4 p-6"
          onSubmit={(event) => {
            event.preventDefault();
            void request(`/api/users/${user.id}/reset-password`, "POST", {
              password,
            });
          }}
        >
          <Field id={`user-${user.id}-password`} label="Contraseña temporal">
            <input
              id={`user-${user.id}-password`}
              type="password"
              autoComplete="new-password"
              className="form-input"
              minLength={12}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </Field>
          <p className="text-xs text-slate-500">
            Mínimo 12 caracteres, con mayúscula, minúscula, número y símbolo.
          </p>
          <Feedback message={feedback} />
          <SubmitButton isLoading={isLoading}>Restablecer</SubmitButton>
        </form>
      </Dialog>

      <Dialog
        open={dialog === "deactivate"}
        onClose={close}
        title="Desactivar usuario"
        description={`Se revocarán todas las sesiones activas de ${user.name}.`}
      >
        <div className="space-y-4 p-6">
          <p className="text-sm">Esta acción conserva el historial y puede auditarse.</p>
          <Feedback message={feedback} />
          <div className="flex gap-3">
            <Button variant="secondary" onClick={close}>Cancelar</Button>
            <Button
              onClick={() =>
                void request(`/api/users/${user.id}/deactivate`, "POST")
              }
              disabled={isLoading}
            >
              {isLoading && <LoaderCircle className="size-4 animate-spin" />}
              Confirmar desactivación
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}

function Field({
  children,
  id,
  label,
}: {
  children: React.ReactNode;
  id: string;
  label: string;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-medium">{label}</label>
      {children}
    </div>
  );
}

function Feedback({ message }: { message: string | null }) {
  return message ? (
    <p className="text-sm text-red-700 md:col-span-2" role="alert">{message}</p>
  ) : null;
}

function SubmitButton({
  children,
  isLoading,
}: {
  children: React.ReactNode;
  isLoading: boolean;
}) {
  return (
    <Button type="submit" disabled={isLoading}>
      {isLoading && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}
      {children}
    </Button>
  );
}
