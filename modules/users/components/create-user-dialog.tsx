"use client";

import { UserPlus } from "lucide-react";
import { useCallback, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import type { BusinessUnitOption } from "@/modules/business-units/types/business-unit.types";
import type { RoleOption } from "@/modules/roles/types/role.types";
import { CreateUserForm } from "@/modules/users/components/create-user-form";

export function CreateUserDialog({
  roles,
  units,
}: {
  roles: RoleOption[];
  units: BusinessUnitOption[];
}) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <UserPlus aria-hidden="true" className="size-4" />
        Nuevo usuario
      </Button>
      <Dialog
        open={open}
        onClose={close}
        title="Crear usuario"
        description="Asigna sus credenciales, roles y unidades de acceso."
        width="xl"
      >
        <CreateUserForm roles={roles} units={units} onSuccess={close} />
      </Dialog>
    </>
  );
}
