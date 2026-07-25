"use client";

import { KeyRound, Ban } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ApiResponse } from "@/types/api-response";

interface UserActionsProps {
  userId: string;
  status: string;
}

export function UserActions({ userId, status }: UserActionsProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleResetPassword = async () => {
    const password = prompt(
      "Ingresa la nueva contraseña temporal (mínimo 12 caracteres):",
    );
    if (password === null) return;
    if (password.length < 12) {
      alert("La contraseña temporal debe tener al menos 12 caracteres.");
      return;
    }
    
    setIsLoading(true);
    try {
      const res = await fetch(`/api/users/${userId}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = (await res.json()) as ApiResponse<unknown>;
      if (res.ok) {
        alert(data.message);
        router.refresh();
      } else {
        alert(data.message || "Ocurrió un error");
      }
    } catch {
      alert("Error de conexión");
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleStatus = async () => {
    if (
      status !== "activo" ||
      !confirm("¿Está seguro de que desea desactivar este usuario?")
    ) return;
    
    setIsLoading(true);
    try {
      const res = await fetch(`/api/users/${userId}/deactivate`, {
        method: "POST",
      });
      if (res.ok) {
        router.refresh();
      } else {
        const data = (await res.json()) as ApiResponse<unknown>;
        alert(data.message || "Ocurrió un error");
      }
    } catch {
      alert("Error de conexión");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-end gap-2">
      <button
        onClick={handleResetPassword}
        disabled={isLoading}
        title="Restablecer contraseña"
        className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50"
      >
        <KeyRound className="size-4" />
      </button>
      {status === "activo" && (
        <button
          onClick={handleToggleStatus}
          disabled={isLoading}
          title="Desactivar usuario"
          className="rounded p-1.5 text-red-500 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
        >
          <Ban className="size-4" />
        </button>
      )}
    </div>
  );
}
