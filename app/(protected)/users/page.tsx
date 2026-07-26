import { ShieldCheck, UsersRound } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { AdministrationNav } from "@/components/layout/administration-nav";
import { SectionTabs } from "@/components/ui/section-tabs";
import { AuthorizationService } from "@/modules/auth/services/authorization.service";
import { getApplicationPrincipal } from "@/modules/auth/services/current-principal.service";
import { BusinessUnitService } from "@/modules/business-units/services/business-unit.service";
import { RoleManager } from "@/modules/roles/components/role-manager";
import { RoleService } from "@/modules/roles/services/role.service";
import { parsePageQuery } from "@/modules/shared/validators/query.validator";
import { CreateUserDialog } from "@/modules/users/components/create-user-dialog";
import { UserActions } from "@/modules/users/components/user-actions";
import { UserService } from "@/modules/users/services/user.service";
import { listUsersQuerySchema } from "@/modules/users/validators/user.validator";

export const metadata: Metadata = {
  title: "Usuarios y roles | SGR-EG",
};
export const dynamic = "force-dynamic";

const authorizationService = new AuthorizationService();
const businessUnitService = new BusinessUnitService();
const roleService = new RoleService();
const userService = new UserService();

interface UsersPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function UsersPage({ searchParams }: UsersPageProps) {
  const principal = await getApplicationPrincipal();
  authorizationService.assertAllowed(principal, "usuarios", "read");

  const raw = await searchParams;
  const activeTab = first(raw.tab) === "roles" ? "roles" : "users";
  const query = parsePageQuery(listUsersQuerySchema, {
    page: first(raw.page),
    pageSize: first(raw.pageSize),
    search: first(raw.search),
    status: first(raw.status),
    roleId: first(raw.roleId),
    unitId: first(raw.unitId),
  });
  const canCreate = authorizationService.isAllowed(principal, "usuarios", "create");
  const canUpdate = authorizationService.isAllowed(principal, "usuarios", "update");
  const canDeactivate = authorizationService.isAllowed(principal, "usuarios", "deactivate");
  const [users, roles, units] = await Promise.all([
    userService.list(query),
    roleService.listActive(),
    businessUnitService.listActive(),
  ]);

  const pageHref = (page: number) => {
    const parameters = new URLSearchParams({ tab: "users", page: String(page) });
    if (query.search) parameters.set("search", query.search);
    if (query.status) parameters.set("status", query.status);
    if (query.roleId) parameters.set("roleId", query.roleId);
    if (query.unitId) parameters.set("unitId", query.unitId);
    return `/users?${parameters.toString()}`;
  };

  return (
    <div className="w-full">
      <AdministrationNav active="users" principal={principal} />
      <section className="surface-card overflow-hidden">
        <header className="flex flex-col gap-4 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-blue-700 text-white">
              {activeTab === "users" ? (
                <UsersRound aria-hidden="true" className="size-5" />
              ) : (
                <ShieldCheck aria-hidden="true" className="size-5" />
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-950">
                Usuarios y roles
              </h1>
              <p className="text-sm text-slate-600">
                Separa las personas de las reglas de acceso para administrar con claridad.
              </p>
            </div>
          </div>
          {activeTab === "users" && canCreate && (
            <CreateUserDialog roles={roles} units={units} />
          )}
        </header>

        <SectionTabs
          active={activeTab}
          label="Administración de acceso"
          tabs={[
            {
              id: "users",
              label: `Usuarios (${users.total})`,
              description: "Personas y asignaciones",
              href: "/users?tab=users",
            },
            {
              id: "roles",
              label: `Roles (${roles.length})`,
              description: "Permisos por módulo",
              href: "/users?tab=roles",
            },
          ]}
        />

        {activeTab === "users" ? (
          <>
            <form
              method="get"
              className="grid gap-3 border-b border-slate-200 bg-white p-4 sm:grid-cols-2 xl:grid-cols-6"
            >
              <input type="hidden" name="tab" value="users" />
              <label className="space-y-1.5 sm:col-span-2">
                <span className="text-xs font-semibold text-slate-600">Buscar</span>
                <input
                  name="search"
                  defaultValue={query.search}
                  className="form-input"
                  placeholder="Nombre o correo electrónico"
                />
              </label>
              <FilterSelect label="Estado" name="status" value={query.status}>
                <option value="">Todos</option>
                <option value="activo">Activo</option>
                <option value="inactivo">Inactivo</option>
              </FilterSelect>
              <FilterSelect label="Rol" name="roleId" value={query.roleId}>
                <option value="">Todos</option>
                {roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
              </FilterSelect>
              <FilterSelect label="Unidad" name="unitId" value={query.unitId}>
                <option value="">Todas</option>
                {units.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}
              </FilterSelect>
              <div className="flex items-end gap-2">
                <button type="submit" className="min-h-11 flex-1 rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white hover:bg-blue-800">
                  Aplicar
                </button>
                <Link href="/users?tab=users" className="inline-flex min-h-11 items-center rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50">
                  Limpiar
                </Link>
              </div>
            </form>

            {users.items.length === 0 ? (
              <EmptyUsers />
            ) : (
              <>
                <ul className="divide-y divide-slate-200 md:hidden">
                  {users.items.map((user) => (
                    <li key={user.id} className="space-y-4 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-950">{user.name}</p>
                          <p className="truncate text-sm text-slate-500">{user.email}</p>
                        </div>
                        <Status status={user.status} />
                      </div>
                      <dl className="grid gap-3 text-sm sm:grid-cols-2">
                        <Summary label="Roles" value={user.roles.map(({ name }) => name).join(", ") || "Sin rol"} />
                        <Summary label="Unidades" value={user.units.map(({ name }) => name).join(", ") || "Sin unidad"} />
                      </dl>
                      <div className="flex justify-end border-t border-slate-100 pt-3">
                        <UserActions user={user} roles={roles} units={units} canUpdate={canUpdate} canDeactivate={canDeactivate} />
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full min-w-4xl text-left text-sm">
                    <thead className="bg-slate-50 text-xs font-semibold tracking-wide text-slate-600 uppercase">
                      <tr>
                        <th className="px-6 py-3" scope="col">Usuario</th>
                        <th className="px-6 py-3" scope="col">Estado</th>
                        <th className="px-6 py-3" scope="col">Roles</th>
                        <th className="px-6 py-3" scope="col">Unidades</th>
                        <th className="px-6 py-3" scope="col">Último acceso</th>
                        <th className="px-6 py-3 text-right" scope="col"><span className="sr-only">Acciones</span></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {users.items.map((user) => (
                        <tr key={user.id} className="hover:bg-slate-50/70">
                          <td className="px-6 py-4">
                            <p className="font-semibold text-slate-950">{user.name}</p>
                            <p className="mt-1 text-slate-500">{user.email}</p>
                          </td>
                          <td className="px-6 py-4"><Status status={user.status} /></td>
                          <td className="max-w-60 px-6 py-4 text-slate-700">{user.roles.map(({ name }) => name).join(", ") || "Sin rol"}</td>
                          <td className="max-w-60 px-6 py-4 text-slate-700">{user.units.map(({ name }) => name).join(", ") || "Sin unidad"}</td>
                          <td className="whitespace-nowrap px-6 py-4 text-slate-600">
                            {user.lastLogin
                              ? new Intl.DateTimeFormat("es-BO", { dateStyle: "medium", timeStyle: "short", timeZone: "America/La_Paz" }).format(user.lastLogin)
                              : "Sin acceso"}
                          </td>
                          <td className="px-6 py-4">
                            <UserActions user={user} roles={roles} units={units} canUpdate={canUpdate} canDeactivate={canDeactivate} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {users.totalPages > 1 && (
                  <nav aria-label="Paginación de usuarios" className="flex items-center justify-between border-t border-slate-200 px-4 py-4 text-sm sm:px-6">
                    <span>Página {users.page} de {users.totalPages}</span>
                    <div className="flex gap-2">
                      {users.page > 1 && <PageLink href={pageHref(users.page - 1)}>Anterior</PageLink>}
                      {users.page < users.totalPages && <PageLink href={pageHref(users.page + 1)}>Siguiente</PageLink>}
                    </div>
                  </nav>
                )}
              </>
            )}
          </>
        ) : (
          <RoleManager
            roles={roles}
            canCreate={canCreate}
            canUpdate={canUpdate}
            canDeactivate={canDeactivate}
          />
        )}
      </section>
    </div>
  );
}

function FilterSelect({ children, label, name, value }: { children: React.ReactNode; label: string; name: string; value?: string }) {
  return (
    <label className="space-y-1.5">
      <span className="text-xs font-semibold text-slate-600">{label}</span>
      <select name={name} defaultValue={value ?? ""} className="form-input">{children}</select>
    </label>
  );
}

function Status({ status }: { status: "activo" | "inactivo" }) {
  return (
    <span className={status === "activo"
      ? "inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800"
      : "inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600"}>
      {status === "activo" ? "Activo" : "Inactivo"}
    </span>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs font-semibold text-slate-500 uppercase">{label}</dt><dd className="mt-1 text-slate-800">{value}</dd></div>;
}

function EmptyUsers() {
  return (
    <div className="p-8 text-center">
      <UsersRound aria-hidden="true" className="mx-auto size-9 text-slate-400" />
      <p className="mt-3 font-semibold text-slate-800">No se encontraron usuarios</p>
      <p className="mt-1 text-sm text-slate-500">Cambia o limpia los filtros para ampliar la búsqueda.</p>
    </div>
  );
}

function PageLink({ children, href }: { children: React.ReactNode; href: string }) {
  return <Link href={href} className="rounded-lg border border-slate-300 px-3 py-2 font-medium hover:bg-slate-50">{children}</Link>;
}
