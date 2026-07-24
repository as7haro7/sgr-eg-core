"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import type { BusinessUnitOption } from "@/modules/business-units/types/business-unit.types";
import type { RoleOption } from "@/modules/roles/types/role.types";
import type { UserSummary } from "@/modules/users/types/user.types";
import {
  createUserSchema,
  type CreateUserFormInput,
  type CreateUserInput,
} from "@/modules/users/validators/user.validator";
import type { ApiResponse } from "@/types/api-response";

interface CreateUserFormProps {
  roles: RoleOption[];
  units: BusinessUnitOption[];
}

export function CreateUserForm({ roles, units }: CreateUserFormProps) {
  const router = useRouter();
  const [feedback, setFeedback] = useState<{
    type: "error" | "success";
    message: string;
  } | null>(null);
  const {
    formState: { errors, isSubmitting },
    getValues,
    handleSubmit,
    register,
    reset,
    setValue,
    watch,
  } = useForm<CreateUserFormInput, unknown, CreateUserInput>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      roleIds: [],
      units: [],
    },
  });
  const selectedRoleIds = watch("roleIds") ?? [];
  const selectedUnits = watch("units") ?? [];

  const toggleRole = (roleId: string, checked: boolean) => {
    const roleIds = getValues("roleIds") ?? [];
    setValue(
      "roleIds",
      checked
        ? [...roleIds, roleId]
        : roleIds.filter((id) => id !== roleId),
      { shouldDirty: true, shouldValidate: true },
    );
  };

  const toggleUnit = (unitId: string, checked: boolean) => {
    const currentUnits = getValues("units") ?? [];
    setValue(
      "units",
      checked
        ? [...currentUnits, { unitId, isPrimary: false }]
        : currentUnits.filter((unit) => unit.unitId !== unitId),
      { shouldDirty: true, shouldValidate: true },
    );
  };

  const setPrimaryUnit = (unitId: string) => {
    setValue(
      "units",
      (getValues("units") ?? []).map((unit) => ({
        ...unit,
        isPrimary: unit.unitId === unitId,
      })),
      { shouldDirty: true, shouldValidate: true },
    );
  };

  const onSubmit = async (input: CreateUserInput) => {
    setFeedback(null);

    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(input),
      });
      const payload = (await response.json()) as ApiResponse<UserSummary>;

      if (!response.ok) {
        setFeedback({ type: "error", message: payload.message });
        return;
      }

      reset();
      setFeedback({
        type: "success",
        message: "Usuario creado correctamente.",
      });
      router.refresh();
    } catch {
      setFeedback({
        type: "error",
        message: "No fue posible conectar con el servidor.",
      });
    }
  };

  return (
    <details className="border-b border-slate-200 dark:border-slate-800">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-6 py-4 text-sm font-semibold text-slate-900 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-slate-950 dark:text-white dark:hover:bg-slate-950/40 dark:focus-visible:outline-white">
        <UserPlus aria-hidden="true" className="size-4" />
        Crear usuario
      </summary>

      <form
        className="grid gap-5 border-t border-slate-200 bg-slate-50/70 p-6 md:grid-cols-2 dark:border-slate-800 dark:bg-slate-950/30"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
      >
        <FormField
          id="name"
          label="Nombre"
          error={errors.name?.message}
        >
          <input
            id="name"
            autoComplete="name"
            className="form-input"
            {...register("name")}
          />
        </FormField>

        <FormField
          id="email"
          label="Correo electrónico"
          error={errors.email?.message}
        >
          <input
            id="email"
            type="email"
            autoComplete="email"
            className="form-input"
            {...register("email")}
          />
        </FormField>

        <FormField
          id="password"
          label="Contraseña inicial"
          error={errors.password?.message}
        >
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            className="form-input"
            {...register("password")}
          />
        </FormField>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-slate-800 dark:text-slate-200">
            Roles
          </legend>
          <div className="grid gap-2 rounded-lg border border-slate-300 bg-white p-3 dark:border-slate-700 dark:bg-slate-950">
            {roles.map((role) => (
              <label
                key={role.id}
                className="flex items-start gap-2 text-sm text-slate-800 dark:text-slate-200"
              >
                <input
                  type="checkbox"
                  className="mt-0.5 size-4"
                  checked={selectedRoleIds.includes(role.id)}
                  onChange={(event) =>
                    toggleRole(role.id, event.target.checked)
                  }
                />
                <span>
                  <span className="font-medium">{role.name}</span>
                  {role.description && (
                    <span className="block text-xs text-slate-500 dark:text-slate-400">
                      {role.description}
                    </span>
                  )}
                </span>
              </label>
            ))}
          </div>
          {errors.roleIds?.message && (
            <p className="text-sm text-red-600" role="alert">
              {errors.roleIds.message}
            </p>
          )}
        </fieldset>

        <fieldset className="space-y-2 md:col-span-2">
          <legend className="text-sm font-medium text-slate-800 dark:text-slate-200">
            Unidades de negocio
          </legend>
          {units.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-300 p-3 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
              No existen unidades de negocio activas.
            </p>
          ) : (
            <div className="grid gap-2 rounded-lg border border-slate-300 bg-white p-3 sm:grid-cols-2 dark:border-slate-700 dark:bg-slate-950">
              {units.map((unit) => {
                const selectedUnit = selectedUnits.find(
                  ({ unitId }) => unitId === unit.id,
                );

                return (
                  <div
                    key={unit.id}
                    className="flex items-center justify-between gap-3 rounded-md border border-slate-200 p-2 dark:border-slate-800"
                  >
                    <label className="flex items-start gap-2 text-sm text-slate-800 dark:text-slate-200">
                      <input
                        type="checkbox"
                        className="mt-0.5 size-4"
                        checked={Boolean(selectedUnit)}
                        onChange={(event) =>
                          toggleUnit(unit.id, event.target.checked)
                        }
                      />
                      <span>
                        <span className="font-medium">{unit.name}</span>
                        <span className="block text-xs text-slate-500 dark:text-slate-400">
                          {unit.country.name} · {unit.currency}
                        </span>
                      </span>
                    </label>
                    <label className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                      <input
                        type="radio"
                        name="primaryUnit"
                        checked={selectedUnit?.isPrimary ?? false}
                        disabled={!selectedUnit}
                        onChange={() => setPrimaryUnit(unit.id)}
                      />
                      Principal
                    </label>
                  </div>
                );
              })}
            </div>
          )}
          {errors.units?.message && (
            <p className="text-sm text-red-600" role="alert">
              {errors.units.message}
            </p>
          )}
        </fieldset>

        {feedback && (
          <div
            className={
              feedback.type === "success"
                ? "rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 md:col-span-2 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
                : "rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 md:col-span-2 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
            }
            role="status"
          >
            {feedback.message}
          </div>
        )}

        <div className="md:col-span-2">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && (
              <LoaderCircle
                aria-hidden="true"
                className="size-4 animate-spin"
              />
            )}
            {isSubmitting ? "Creando..." : "Crear usuario"}
          </Button>
        </div>
      </form>
    </details>
  );
}

interface FormFieldProps {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}

function FormField({
  id,
  label,
  error,
  children,
}: FormFieldProps) {
  return (
    <div className="space-y-2">
      <label
        className="text-sm font-medium text-slate-800 dark:text-slate-200"
        htmlFor={id}
      >
        {label}
      </label>
      {children}
      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
