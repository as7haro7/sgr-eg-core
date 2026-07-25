"use client";

import { Ban, CheckCircle, Edit2 } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";

interface OrganizationActionsProps {
  id: string;
  type: "country" | "unit" | "category";
  status: string;
  currentName: string;
}

export function OrganizationActions({ id, type, status, currentName }: OrganizationActionsProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editName, setEditName] = useState(currentName);

  const endpoint = type === "country" 
    ? `/api/countries/${id}` 
    : type === "unit" 
    ? `/api/business-units/${id}`
    : `/api/risk-categories/${id}`;

  const handleToggleStatus = async () => {
    if (!confirm(`¿Está seguro de que desea ${status === "activo" ? "desactivar" : "activar"} este elemento?`)) return;
    
    setIsLoading(true);
    try {
      const res = await fetch(`${endpoint}/deactivate`, {
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

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName }),
      });
      if (res.ok) {
        setIsEditModalOpen(false);
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
    <>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setIsEditModalOpen(true)}
          disabled={isLoading}
          title="Editar nombre"
          className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50"
        >
          <Edit2 className="size-4" />
        </button>
        <button
          onClick={handleToggleStatus}
          disabled={isLoading}
          title={status === "activo" ? "Desactivar" : "Activar"}
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

      <Dialog
        open={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Editar elemento"
        description="Modifica el nombre del registro."
      >
        <form onSubmit={handleEdit} className="space-y-4 p-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-800 dark:text-slate-200">
              Nombre
            </label>
            <input
              type="text"
              required
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="form-input"
            />
          </div>
          <Button type="submit" disabled={isLoading}>
            Guardar cambios
          </Button>
        </form>
      </Dialog>
    </>
  );
}
