"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
  changePasswordSchema,
  type ChangePasswordInput,
} from "@/modules/auth/validators/change-password.validator";
import type { ApiResponse } from "@/types/api-response";

export function ChangePasswordForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      passwordConfirmation: "",
    },
  });

  const onSubmit = async (input: ChangePasswordInput) => {
    setServerError(null);

    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(input),
      });
      const payload = (await response.json()) as ApiResponse<null>;

      if (!response.ok) {
        setServerError(payload.message);
        return;
      }

      router.replace("/login");
      router.refresh();
    } catch {
      setServerError(
        "No fue posible conectar con el servidor. Inténtalo nuevamente.",
      );
    }
  };

  return (
    <form className="space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
      <PasswordField
        id="currentPassword"
        label="Contraseña actual"
        autoComplete="current-password"
        error={errors.currentPassword?.message}
        registration={register("currentPassword")}
      />
      <PasswordField
        id="newPassword"
        label="Nueva contraseña"
        autoComplete="new-password"
        error={errors.newPassword?.message}
        registration={register("newPassword")}
      />
      <PasswordField
        id="passwordConfirmation"
        label="Confirmar nueva contraseña"
        autoComplete="new-password"
        error={errors.passwordConfirmation?.message}
        registration={register("passwordConfirmation")}
      />

      {serverError && (
        <div
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
          role="alert"
        >
          {serverError}
        </div>
      )}

      <Button className="w-full" type="submit" disabled={isSubmitting}>
        {isSubmitting && (
          <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
        )}
        {isSubmitting ? "Actualizando..." : "Actualizar contraseña"}
      </Button>
    </form>
  );
}

interface PasswordFieldProps {
  id: string;
  label: string;
  autoComplete: "current-password" | "new-password";
  error?: string;
  registration: ReturnType<
    ReturnType<typeof useForm<ChangePasswordInput>>["register"]
  >;
}

function PasswordField({
  autoComplete,
  error,
  id,
  label,
  registration,
}: PasswordFieldProps) {
  const errorId = `${id}-error`;

  return (
    <div className="space-y-2">
      <label
        className="text-sm font-medium text-slate-800 dark:text-slate-200"
        htmlFor={id}
      >
        {label}
      </label>
      <input
        id={id}
        type="password"
        autoComplete={autoComplete}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-white dark:focus:ring-white/10"
        {...registration}
      />
      {error && (
        <p id={errorId} className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
