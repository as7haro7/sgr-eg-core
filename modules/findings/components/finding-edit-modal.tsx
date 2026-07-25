"use client";

import { Edit } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import type { FindingSummary } from "@/modules/findings/types/finding.types";
import type { AuditUserOption } from "@/modules/audits/types/audit.types";

const editFindingSchema = z.object({
  severity: z.enum(["baja", "media", "alta", "critica"]),
  condition: z.string().min(10, "La condición debe tener al menos 10 caracteres."),
  recommendation: z.string().min(10, "La recomendación debe tener al menos 10 caracteres."),
  responsibleId: z.string().optional(),
  deadline: z.string().optional(),
});

type EditFindingInput = z.infer<typeof editFindingSchema>;

interface FindingEditModalProps {
  finding: FindingSummary;
  users: AuditUserOption[];
  canUpdate: boolean;
}

export function FindingEditModal({ finding, users, canUpdate }: FindingEditModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "error" | "success"; message: string } | null>(null);
  const router = useRouter();

  const form = useForm<EditFindingInput>({
    resolver: zodResolver(editFindingSchema),
    defaultValues: {
      severity: finding.severity,
      condition: finding.condition,
      recommendation: finding.recommendation,
      responsibleId: finding.responsible?.id ?? "",
      deadline: finding.deadline ? new Date(finding.deadline).toISOString().split("T")[0] : "",
    },
  });

  const onSubmit = async (data: EditFindingInput) => {
    setFeedback(null);
    try {
      const payload = {
        severity: data.severity,
        condition: data.condition,
        recommendation: data.recommendation,
        responsibleId: data.responsibleId || null,
        deadline: data.deadline ? new Date(data.deadline).toISOString() : null,
      };

      const res = await fetch(`/api/findings/${finding.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        setFeedback({ type: "error", message: json.message || "Error al actualizar." });
        return;
      }

      setIsOpen(false);
      router.refresh();
    } catch (e) {
      setFeedback({ type: "error", message: "Error de red al actualizar." });
    }
  };

  if (!canUpdate || finding.status === "cerrado") return null;

  return (
    <>
      <Button
        variant="secondary"
        onClick={() => setIsOpen(true)}
      >
        <Edit aria-hidden="true" className="size-4" />
        Editar
      </Button>

      <Dialog
        open={isOpen}
        onClose={() => setIsOpen(false)}
        title="Editar Hallazgo"
        description="Modifica los detalles del hallazgo."
        width="lg"
      >
        <form
          className="grid gap-4 p-5 sm:grid-cols-2"
          onSubmit={form.handleSubmit(onSubmit)}
          noValidate
        >
          <FormField
            id="edit-severity"
            label="Severidad"
            error={form.formState.errors.severity?.message}
          >
            <select className="form-input" {...form.register("severity")}>
              <option value="baja">Baja</option>
              <option value="media">Media</option>
              <option value="alta">Alta</option>
              <option value="critica">Crítica</option>
            </select>
          </FormField>
          
          <FormField
            id="edit-responsible"
            label="Responsable"
            error={form.formState.errors.responsibleId?.message}
          >
            <select className="form-input" {...form.register("responsibleId")}>
              <option value="">Sin asignar</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </FormField>
          
          <div className="sm:col-span-2">
            <FormField
              id="edit-condition"
              label="Condición"
              error={form.formState.errors.condition?.message}
            >
              <textarea
                className="form-input min-h-24 resize-none"
                {...form.register("condition")}
              />
            </FormField>
          </div>
          
          <div className="sm:col-span-2">
            <FormField
              id="edit-recommendation"
              label="Recomendación"
              error={form.formState.errors.recommendation?.message}
            >
              <textarea
                className="form-input min-h-24 resize-none"
                {...form.register("recommendation")}
              />
            </FormField>
          </div>
          
          <FormField
            id="edit-deadline"
            label="Fecha límite"
            error={form.formState.errors.deadline?.message}
          >
            <input
              type="date"
              className="form-input"
              {...form.register("deadline")}
            />
          </FormField>
          
          <div className="mt-4 flex flex-col gap-3 sm:col-span-2 sm:flex-row sm:items-center sm:justify-end border-t border-slate-200 pt-5">
            {feedback && (
              <p className="flex-1 text-sm font-medium text-red-600">
                {feedback.message}
              </p>
            )}
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsOpen(false)}
              disabled={form.formState.isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              Guardar Cambios
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
