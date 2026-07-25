"use client";

import { GitBranch } from "lucide-react";
import { useCallback, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import type { estado_riesgo } from "@/generated/prisma/client";
import { RiskTransitionForm } from "@/modules/risks/components/risk-transition-form";

export function RiskTransitionDialog({
  riskId,
  transitions,
}: {
  riskId: string;
  transitions: estado_riesgo[];
}) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        <GitBranch aria-hidden="true" className="size-4" />
        Cambiar estado
      </Button>
      <Dialog
        open={open}
        onClose={close}
        title="Cambiar estado del riesgo"
        description="Selecciona el siguiente estado permitido. Algunas transiciones requieren información adicional."
      >
        <div className="p-6">
          <RiskTransitionForm
            riskId={riskId}
            transitions={transitions}
            onSuccess={close}
          />
        </div>
      </Dialog>
    </>
  );
}
