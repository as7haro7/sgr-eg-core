"use client";

import { Edit2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import type { CountrySummary } from "@/modules/business-units/types/business-unit.types";
import { RegulationForm } from "@/modules/regulations/components/regulation-form";
import type { RegulationSummary } from "@/modules/regulations/types/regulation.types";

export function RegulationEditor({
  countries,
  regulation,
}: {
  countries: CountrySummary[];
  regulation: RegulationSummary;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        <Edit2 aria-hidden="true" className="size-4" />
        Editar normativa
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Editar normativa"
        description="Actualiza jurisdicción, versión, vigencia, país y estado."
        width="lg"
      >
        <RegulationForm
          countries={countries}
          regulation={regulation}
          onSuccess={() => setOpen(false)}
        />
      </Dialog>
    </>
  );
}
