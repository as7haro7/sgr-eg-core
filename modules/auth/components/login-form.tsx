"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle, LockKeyhole, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import type { AuthPrincipal } from "@/modules/auth/types/auth.types";
import {
  loginSchema,
  type LoginFormInput,
  type LoginInput,
} from "@/modules/auth/validators/login.validator";
import type { ApiResponse } from "@/types/api-response";

interface LoginResponse {
  expiresAt: string;
  principal: AuthPrincipal;
}

export function LoginForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
  } = useForm<LoginFormInput, unknown, LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      correo: "",
      password: "",
    },
  });

  const onSubmit = async (input: LoginInput) => {
    setServerError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(input),
      });
      const payload = (await response.json()) as ApiResponse<LoginResponse>;

      if (!response.ok) {
        setServerError(payload.message);
        return;
      }

      router.replace(
        payload.data?.principal.mustChangePassword
          ? "/change-password"
          : "/",
      );
      router.refresh();
    } catch {
      setServerError(
        "No fue posible conectar con el servidor. Inténtalo nuevamente.",
      );
    }
  };

  return (
    <form className="space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="space-y-2">
        <label
          className="text-sm font-medium text-slate-800 dark:text-slate-200"
          htmlFor="correo"
        >
          Correo electrónico
        </label>
        <div className="relative">
          <Mail
            aria-hidden="true"
            className="absolute left-3 top-1/2 size-5 -translate-y-1/2 text-slate-400"
          />
          <input
            id="correo"
            type="email"
            autoComplete="email"
            aria-invalid={Boolean(errors.correo)}
            aria-describedby={errors.correo ? "correo-error" : undefined}
            className="h-11 w-full rounded-lg border border-slate-300 bg-white pl-10 pr-3 text-sm text-slate-950 outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-white dark:focus:ring-white/10"
            {...register("correo")}
          />
        </div>
        {errors.correo && (
          <p id="correo-error" className="text-sm text-red-600" role="alert">
            {errors.correo.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <label
          className="text-sm font-medium text-slate-800 dark:text-slate-200"
          htmlFor="password"
        >
          Contraseña
        </label>
        <div className="relative">
          <LockKeyhole
            aria-hidden="true"
            className="absolute left-3 top-1/2 size-5 -translate-y-1/2 text-slate-400"
          />
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            aria-invalid={Boolean(errors.password)}
            aria-describedby={
              errors.password ? "password-error" : undefined
            }
            className="h-11 w-full rounded-lg border border-slate-300 bg-white pl-10 pr-3 text-sm text-slate-950 outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-white dark:focus:ring-white/10"
            {...register("password")}
          />
        </div>
        {errors.password && (
          <p
            id="password-error"
            className="text-sm text-red-600"
            role="alert"
          >
            {errors.password.message}
          </p>
        )}
      </div>

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
        {isSubmitting ? "Iniciando sesión..." : "Iniciar sesión"}
      </Button>
    </form>
  );
}
