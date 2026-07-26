"use client";

import { Edit2, LoaderCircle, Plus, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import type { RoleOption } from "@/modules/roles/types/role.types";
import type { ApiResponse } from "@/types/api-response";

type Scope = "global" | "unidad" | "propio" | "asignado";
type Permission = RoleOption["permissions"][number];

export function RoleManager({
  canCreate,
  canDeactivate,
  canUpdate,
  roles,
}: {
  canCreate: boolean;
  canDeactivate: boolean;
  canUpdate: boolean;
  roles: RoleOption[];
}) {
  const modules = useMemo(() => {
    const entries = roles.flatMap(({ permissions }) =>
      permissions.map(({ moduleCode, moduleName }) => [moduleCode, moduleName] as const),
    );
    return [...new Map(entries).entries()].map(([code, name]) => ({ code, name }));
  }, [roles]);

  return (
    <section className="border-t border-slate-200 p-6 dark:border-slate-800">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <ShieldCheck aria-hidden="true" className="size-5" />
            Roles y permisos
          </h2>
          <p className="text-sm text-slate-500">
            Matriz de acceso por módulo, acción y alcance.
          </p>
        </div>
        {canCreate && <RoleEditor modules={modules} />}
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {roles.map((role) => (
          <article key={role.id} className="rounded-xl border p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-bold">{role.name}</h3>
                <p className="text-sm text-slate-500">{role.description || "Sin descripción"}</p>
              </div>
              {role.name !== "administrador" && canUpdate && (
                <RoleEditor role={role} modules={modules} canDeactivate={canDeactivate} />
              )}
            </div>
            <ul className="mt-3 space-y-1 text-xs text-slate-600">
              {role.permissions.map((permission) => (
                <li key={permission.moduleCode}>
                  <span className="font-semibold">{permission.moduleName}</span>:{" "}
                  {permissionLabels(permission)} · {permission.scope}
                </li>
              ))}
              {role.permissions.length === 0 && <li>Sin permisos asignados.</li>}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}

function RoleEditor({
  canDeactivate = false,
  modules,
  role,
}: {
  canDeactivate?: boolean;
  modules: Array<{ code: string; name: string }>;
  role?: RoleOption;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [name, setName] = useState(role?.name ?? "");
  const [description, setDescription] = useState(role?.description ?? "");
  const [permissions, setPermissions] = useState<Permission[]>(
    modules.map(({ code, name: moduleName }) => {
      const current = role?.permissions.find(({ moduleCode }) => moduleCode === code);
      return current ?? {
        moduleCode: code,
        moduleName,
        canCreate: false,
        canRead: false,
        canUpdate: false,
        canDeactivate: false,
        scope: "unidad",
      };
    }),
  );

  const updatePermission = (moduleCode: string, changes: Partial<Permission>) => {
    setPermissions((current) =>
      current.map((permission) =>
        permission.moduleCode === moduleCode
          ? { ...permission, ...changes }
          : permission,
      ),
    );
  };

  const send = async (deactivate = false) => {
    setIsLoading(true);
    setFeedback(null);
    try {
      const url = role
        ? `/api/roles/${role.id}${deactivate ? "/deactivate" : ""}`
        : "/api/roles";
      const response = await fetch(url, {
        method: role && !deactivate ? "PATCH" : "POST",
        headers: deactivate ? undefined : { "Content-Type": "application/json" },
        body: deactivate
          ? undefined
          : JSON.stringify({
              name,
              description,
              permissions: permissions
                .filter((permission) =>
                  permission.canCreate ||
                  permission.canRead ||
                  permission.canUpdate ||
                  permission.canDeactivate,
                )
                .map((permission) => ({
                  moduleCode: permission.moduleCode,
                  canCreate: permission.canCreate,
                  canRead: permission.canRead,
                  canUpdate: permission.canUpdate,
                  canDeactivate: permission.canDeactivate,
                  scope: permission.scope,
                })),
            }),
      });
      const payload = (await response.json()) as ApiResponse<unknown>;
      if (!response.ok) {
        setFeedback(payload.message);
        return;
      }
      setOpen(false);
      router.refresh();
    } catch {
      setFeedback("No fue posible conectar con el servidor.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button variant={role ? "secondary" : "primary"} onClick={() => setOpen(true)}>
        {role ? <Edit2 className="size-4" /> : <Plus className="size-4" />}
        {role ? "Editar" : "Nuevo rol"}
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={role ? `Editar rol: ${role.name}` : "Nuevo rol"}
        description="Selecciona las acciones permitidas y su alcance."
        width="xl"
      >
        <form
          className="space-y-5 p-6"
          onSubmit={(event) => {
            event.preventDefault();
            void send();
          }}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm font-medium">
              <span>Nombre</span>
              <input className="form-input" required maxLength={50} value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label className="space-y-2 text-sm font-medium">
              <span>Descripción</span>
              <input className="form-input" value={description} onChange={(e) => setDescription(e.target.value)} />
            </label>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-2xl text-left text-sm">
              <thead>
                <tr className="border-b">
                  <th className="py-2">Módulo</th>
                  <th>Leer</th><th>Crear</th><th>Actualizar</th><th>Desactivar</th><th>Alcance</th>
                </tr>
              </thead>
              <tbody>
                {permissions.map((permission) => (
                  <tr key={permission.moduleCode} className="border-b">
                    <th className="py-2 font-medium">{permission.moduleName}</th>
                    {(["canRead", "canCreate", "canUpdate", "canDeactivate"] as const).map((action) => (
                      <td key={action}>
                        <input
                          type="checkbox"
                          aria-label={`${permission.moduleName}: ${action}`}
                          checked={permission[action]}
                          onChange={(event) => updatePermission(permission.moduleCode, { [action]: event.target.checked })}
                        />
                      </td>
                    ))}
                    <td>
                      <select
                        className="form-input min-w-28"
                        aria-label={`Alcance de ${permission.moduleName}`}
                        value={permission.scope}
                        onChange={(event) => updatePermission(permission.moduleCode, { scope: event.target.value as Scope })}
                      >
                        <option value="global">Global</option>
                        <option value="unidad">Unidad</option>
                        <option value="propio">Propio</option>
                        <option value="asignado">Asignado</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {feedback && <p className="text-sm text-red-700" role="alert">{feedback}</p>}
          <div className="flex flex-wrap justify-between gap-3">
            <Button type="submit" disabled={isLoading}>
              {isLoading && <LoaderCircle className="size-4 animate-spin" />}
              Guardar rol
            </Button>
            {role && canDeactivate && (
              <Button type="button" variant="secondary" disabled={isLoading} onClick={() => void send(true)}>
                Desactivar rol
              </Button>
            )}
          </div>
        </form>
      </Dialog>
    </>
  );
}

function permissionLabels(permission: Permission) {
  const labels = [
    permission.canRead && "leer",
    permission.canCreate && "crear",
    permission.canUpdate && "actualizar",
    permission.canDeactivate && "desactivar",
  ].filter(Boolean);
  return labels.join(", ") || "sin acciones";
}
