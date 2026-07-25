import { ArrowLeft, UsersRound } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { AuthorizationService } from "@/modules/auth/services/authorization.service";
import { getApplicationPrincipal } from "@/modules/auth/services/current-principal.service";
import { BusinessUnitService } from "@/modules/business-units/services/business-unit.service";
import { RoleService } from "@/modules/roles/services/role.service";
import { parsePageQuery } from "@/modules/shared/validators/query.validator";
import { CreateUserDialog } from "@/modules/users/components/create-user-dialog";
import { UserActions } from "@/modules/users/components/user-actions";
import { UserService } from "@/modules/users/services/user.service";
import { listUsersQuerySchema } from "@/modules/users/validators/user.validator";

export const metadata: Metadata = {
  title: "Usuarios | SGR-EG",
};

export const dynamic = "force-dynamic";

const authorizationService = new AuthorizationService();
const businessUnitService = new BusinessUnitService();
const roleService = new RoleService();
const userService = new UserService();

interface UsersPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function UsersPage({ searchParams }: UsersPageProps) {
  const principal = await getApplicationPrincipal();

  authorizationService.assertAllowed(principal, "usuarios", "read");

  const rawSearchParams = await searchParams;
  const query = parsePageQuery(listUsersQuerySchema, {
    page: Array.isArray(rawSearchParams.page)
      ? rawSearchParams.page[0]
      : rawSearchParams.page,
    pageSize: Array.isArray(rawSearchParams.pageSize)
      ? rawSearchParams.pageSize[0]
      : rawSearchParams.pageSize,
    search: Array.isArray(rawSearchParams.search)
      ? rawSearchParams.search[0]
      : rawSearchParams.search,
    status: Array.isArray(rawSearchParams.status)
      ? rawSearchParams.status[0]
      : rawSearchParams.status,
    roleId: Array.isArray(rawSearchParams.roleId)
      ? rawSearchParams.roleId[0]
      : rawSearchParams.roleId,
    unitId: Array.isArray(rawSearchParams.unitId)
      ? rawSearchParams.unitId[0]
      : rawSearchParams.unitId,
  });
  const canCreateUsers = authorizationService.isAllowed(
    principal,
    "usuarios",
    "create",
  );
  const [users, roles, units] = await Promise.all([
    userService.list(query),
    canCreateUsers ? roleService.listActive() : Promise.resolve([]),
    canCreateUsers
      ? businessUnitService.listActive()
      : Promise.resolve([]),
  ]);

  return (
    <div className="w-full">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <header className="flex flex-col gap-4 border-b border-slate-200 p-6 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
          <div>
            <Link
              href="/"
              className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white"
            >
              <ArrowLeft aria-hidden="true" className="size-4" />
              Volver
            </Link>
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-slate-950 text-white dark:bg-white dark:text-slate-950">
                <UsersRound aria-hidden="true" className="size-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-950 dark:text-white">
                  Usuarios
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  {users.total} usuario{users.total === 1 ? "" : "s"}
                </p>
              </div>
            </div>
          </div>
          {canCreateUsers && (
            <CreateUserDialog roles={roles} units={units} />
          )}
        </header>

        <div className="overflow-x-auto">
          <table className="w-full min-w-3xl border-collapse text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold tracking-wide text-slate-600 uppercase dark:bg-slate-950/50 dark:text-slate-400">
              <tr>
                <th className="px-6 py-3" scope="col">
                  Usuario
                </th>
                <th className="px-6 py-3" scope="col">
                  Estado
                </th>
                <th className="px-6 py-3" scope="col">
                  Roles
                </th>
                <th className="px-6 py-3" scope="col">
                  Unidades
                </th>
                <th className="px-6 py-3" scope="col">
                  Último acceso
                </th>
                <th className="px-6 py-3 text-right" scope="col">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {users.items.map((user) => (
                <tr key={user.id}>
                  <td className="px-6 py-4">
                    <p className="font-semibold text-slate-950 dark:text-white">
                      {user.name}
                    </p>
                    <p className="mt-1 text-slate-500 dark:text-slate-400">
                      {user.email}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                      {user.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-700 dark:text-slate-200">
                    {user.roles.map(({ name }) => name).join(", ") || "—"}
                  </td>
                  <td className="px-6 py-4 text-slate-700 dark:text-slate-200">
                    {user.units.map(({ name }) => name).join(", ") || "—"}
                  </td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                    {user.lastLogin
                      ? new Intl.DateTimeFormat("es-BO", {
                          dateStyle: "medium",
                          timeStyle: "short",
                          timeZone: "America/La_Paz",
                        }).format(user.lastLogin)
                      : "Sin acceso"}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <UserActions userId={user.id} status={user.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
