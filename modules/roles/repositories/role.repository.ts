import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { TransactionClient } from "@/lib/transaction";

type RoleDatabaseClient = Pick<
  TransactionClient,
  "bitacora" | "modulos" | "permisos_rol" | "roles"
>;

const roleSelect = {
  id: true,
  nombre: true,
  descripcion: true,
  estado: true,
  permisos_rol: {
    select: {
      puede_crear: true,
      puede_leer: true,
      puede_actualizar: true,
      puede_desactivar: true,
      alcance: true,
      modulos: { select: { codigo: true, nombre: true } },
    },
    orderBy: { modulos: { codigo: "asc" } },
  },
} satisfies Prisma.rolesSelect;

export class RoleRepository {
  constructor(private readonly database: RoleDatabaseClient = prisma) {}

  listActive() {
    return this.database.roles.findMany({
      where: { estado: "activo" },
      select: roleSelect,
      orderBy: [{ nombre: "asc" }, { id: "asc" }],
    });
  }

  findById(id: string) {
    return this.database.roles.findUnique({
      where: { id },
      select: roleSelect,
    });
  }

  findByName(name: string) {
    return this.database.roles.findUnique({
      where: { nombre: name },
      select: { id: true },
    });
  }

  findModules(codes: string[]) {
    return this.database.modulos.findMany({
      where: { codigo: { in: codes } },
      select: { id: true, codigo: true },
    });
  }

  create(data: Prisma.rolesUncheckedCreateInput) {
    return this.database.roles.create({
      data,
      select: { id: true },
    });
  }

  update(id: string, data: Prisma.rolesUncheckedUpdateInput) {
    return this.database.roles.update({
      where: { id },
      data,
      select: { id: true },
    });
  }

  async replacePermissions(
    roleId: string,
    permissions: Array<{
      moduleId: string;
      canCreate: boolean;
      canRead: boolean;
      canUpdate: boolean;
      canDeactivate: boolean;
      scope: Prisma.permisos_rolUncheckedCreateInput["alcance"];
    }>,
  ) {
    await this.database.permisos_rol.deleteMany({
      where: { rol_id: roleId },
    });
    if (permissions.length > 0) {
      await this.database.permisos_rol.createMany({
        data: permissions.map((permission) => ({
          rol_id: roleId,
          modulo_id: permission.moduleId,
          puede_crear: permission.canCreate,
          puede_leer: permission.canRead,
          puede_actualizar: permission.canUpdate,
          puede_desactivar: permission.canDeactivate,
          alcance: permission.scope,
        })),
      });
    }
  }

  recordAudit(data: Prisma.bitacoraUncheckedCreateInput) {
    return this.database.bitacora.create({ data, select: { id: true } });
  }
}
