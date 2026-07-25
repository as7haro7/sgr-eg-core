"use client";

import { KeyRound, Ban, CheckCircle } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface UserActionsProps {
  userId: string;
  status: string;
}

export function UserActions({ userId, status }: UserActionsProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleResetPassword = async () => {
    if (!confirm("¿Está seguro de que desea restablecer la contraseña de este usuario?")) return;
    
    setIsLoading(true);
    try {
      const res = await fetch(`/api/users/${userId}/reset-password`, {
        method: "POST",
      });
      if (res.ok) {
        alert("Contraseña restablecida correctamente. El usuario deberá cambiarla en su próximo ingreso.");
        router.refresh();
      } else {
        const data = await res.json();
        alert(data.error || "Ocurrió un error");
      }
    } catch (e) {
      alert("Error de conexión");
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!confirm(`¿Está seguro de que desea ${status === "activo" ? "desactivar" : "activar"} este usuario?`)) return;
    
    setIsLoading(true);
    try {
      const res = await fetch(`/api/users/${userId}/deactivate`, {
        method: "POST",
      });
      if (res.ok) {
        router.refresh();
      } else {
        const data = await res.json();
        alert(data.error || "Ocurrió un error");
      }
    } catch (e) {
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
      <button
        onClick={handleToggleStatus}
        disabled={isLoading}
        title={status === "activo" ? "Desactivar usuario" : "Activar usuario"}
        className={`rounded p-1.5 disabled:opacity-50 ${
          status === "activo" 
            ? "text-red-500 hover:bg-red-50 hover:text-red-700" 
            : "text-emerald-500 hover:bg-emerald-50 hover:text-emerald-700"
        }`}
      >
        {status === "activo" ? (
          <Ban className="size-4" />
        ) : (
          <CheckCircle className="size-4" />
        )}
      </button>
    </div>
  );
}
