import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { TransactionClient } from "@/lib/transaction";
import type { ListUsersQuery } from "@/modules/users/validators/user.validator";

type UserDatabaseClient = Pick<
  TransactionClient,
  | "bitacora"
  | "roles"
  | "sesiones"
  | "unidades_negocio"
  | "usuario_roles"
  | "usuario_unidades"
  | "usuarios"
>;

export const userSummarySelect = {
  id: true,
  nombre: true,
  correo: true,
  estado: true,
  debe_cambiar_password: true,
  ultimo_login: true,
  created_at: true,
  usuario_roles: {
    select: {
      roles: {
        select: {
          id: true,
          nombre: true,
        },
      },
    },
  },
  usuario_unidades: {
    select: {
      es_principal: true,
      unidades_negocio: {
        select: {
          id: true,
          nombre: true,
        },
      },
    },
  },
} satisfies Prisma.usuariosSelect;

export type UserSummaryRecord = Prisma.usuariosGetPayload<{
  select: typeof userSummarySelect;
}>;

export class UserRepository {
  constructor(private readonly database: UserDatabaseClient = prisma) {}

  async list(query: ListUsersQuery) {
    const where: Prisma.usuariosWhereInput = {
      deleted_at: null,
      estado: query.status,
      usuario_roles: query.roleId
        ? { some: { rol_id: query.roleId } }
        : undefined,
      usuario_unidades: query.unitId
        ? { some: { unidad_id: query.unitId } }
        : undefined,
      OR: query.search
        ? [
            {
              nombre: {
                contains: query.search,
                mode: "insensitive",
              },
            },
            {
              correo: {
                contains: query.search,
                mode: "insensitive",
              },
            },
          ]
        : undefined,
    };
    const [total, items] = await Promise.all([
      this.database.usuarios.count({ where }),
      this.database.usuarios.findMany({
        where,
        select: userSummarySelect,
        orderBy: [{ nombre: "asc" }, { id: "asc" }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);

    return { items, total };
  }

  findById(userId: string) {
    return this.database.usuarios.findFirst({
      where: {
        id: userId,
        deleted_at: null,
      },
      select: userSummarySelect,
    });
  }

  findByEmail(email: string) {
    return this.database.usuarios.findUnique({
      where: { correo: email },
      select: {
        id: true,
        deleted_at: true,
      },
    });
  }

  findActiveRoleIds(roleIds: string[]) {
    return this.database.roles.findMany({
      where: {
        id: { in: roleIds },
        estado: "activo",
      },
      select: { id: true },
    });
  }

  findActiveUnitIds(unitIds: string[]) {
    return this.database.unidades_negocio.findMany({
      where: {
        id: { in: unitIds },
        estado: "activo",
      },
      select: { id: true },
    });
  }

  createUser(data: Prisma.usuariosUncheckedCreateInput) {
    return this.database.usuarios.create({
      data,
      select: userSummarySelect,
    });
  }

  updateUser(
    userId: string,
    data: Prisma.usuariosUncheckedUpdateInput,
  ) {
    return this.database.usuarios.update({
      where: { id: userId },
      data,
      select: userSummarySelect,
    });
  }

  async replaceRoles(userId: string, roleIds: string[]): Promise<void> {
    await this.database.usuario_roles.deleteMany({
      where: { usuario_id: userId },
    });

    if (roleIds.length > 0) {
      await this.database.usuario_roles.createMany({
        data: roleIds.map((roleId) => ({
          usuario_id: userId,
          rol_id: roleId,
        })),
      });
    }
  }

  async replaceUnits(
    userId: string,
    units: Array<{ unitId: string; isPrimary: boolean }>,
  ): Promise<void> {
    await this.database.usuario_unidades.deleteMany({
      where: { usuario_id: userId },
    });

    if (units.length > 0) {
      await this.database.usuario_unidades.createMany({
        data: units.map(({ unitId, isPrimary }) => ({
          usuario_id: userId,
          unidad_id: unitId,
          es_principal: isPrimary,
        })),
      });
    }
  }

  revokeActiveSessions(userId: string, revokedAt: Date) {
    return this.database.sesiones.updateMany({
      where: {
        usuario_id: userId,
        estado: "activa",
      },
      data: {
        estado: "revocada",
        revocada_at: revokedAt,
      },
    });
  }

  recordAudit(data: Prisma.bitacoraUncheckedCreateInput) {
    return this.database.bitacora.create({
      data,
      select: { id: true },
    });
  }
}
