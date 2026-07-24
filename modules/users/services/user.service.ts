import { AppError } from "@/lib/app-error";
import { withAuditContext } from "@/lib/transaction";
import { PasswordHasher } from "@/modules/auth/services/password-hasher.service";
import {
  UserRepository,
  type UserSummaryRecord,
} from "@/modules/users/repositories/user.repository";
import type {
  PaginatedUsers,
  UserSummary,
} from "@/modules/users/types/user.types";
import type {
  CreateUserInput,
  ListUsersQuery,
  ResetPasswordInput,
  UpdateUserInput,
} from "@/modules/users/validators/user.validator";

function mapUser(record: UserSummaryRecord): UserSummary {
  return {
    id: record.id,
    name: record.nombre,
    email: record.correo,
    status: record.estado,
    mustChangePassword: record.debe_cambiar_password,
    lastLogin: record.ultimo_login,
    createdAt: record.created_at,
    roles: record.usuario_roles.map(({ roles }) => ({
      id: roles.id,
      name: roles.nombre,
    })),
    units: record.usuario_unidades.map(
      ({ es_principal, unidades_negocio }) => ({
        id: unidades_negocio.id,
        name: unidades_negocio.nombre,
        isPrimary: es_principal,
      }),
    ),
  };
}

function notFoundError(): AppError {
  return new AppError("NOT_FOUND", "El usuario no existe.", 404);
}

function invalidReferenceError(message: string, field: string): AppError {
  return new AppError("VALIDATION_ERROR", message, 400, [
    {
      code: "VALIDATION_ERROR",
      field,
      message,
    },
  ]);
}

export class UserService {
  constructor(
    private readonly repository = new UserRepository(),
    private readonly passwordHasher = new PasswordHasher(),
  ) {}

  async list(query: ListUsersQuery): Promise<PaginatedUsers> {
    const result = await this.repository.list(query);

    return {
      items: result.items.map(mapUser),
      page: query.page,
      pageSize: query.pageSize,
      total: result.total,
      totalPages: Math.ceil(result.total / query.pageSize),
    };
  }

  async create(
    input: CreateUserInput,
    actorId: string,
  ): Promise<UserSummary> {
    await this.assertEmailAvailable(input.email);
    await this.assertReferences(input.roleIds, input.units);
    const passwordHash = await this.passwordHasher.hash(input.password);

    const createdUser = await withAuditContext(
      actorId,
      async (transaction) => {
        const repository = new UserRepository(transaction);
        const user = await repository.createUser({
          nombre: input.name,
          correo: input.email,
          password_hash: passwordHash,
          estado: "activo",
          debe_cambiar_password: true,
        });

        await repository.replaceRoles(user.id, input.roleIds);
        await repository.replaceUnits(user.id, input.units);
        await repository.recordAudit({
          usuario_id: actorId,
          accion: "configurar_acceso",
          entidad: "usuarios",
          entidad_id: user.id,
          resultado: "exitoso",
          detalles: {
            roles: input.roleIds,
            unidades: input.units.map(({ unitId, isPrimary }) => ({
              unidad_id: unitId,
              es_principal: isPrimary,
            })),
          },
        });

        const completeUser = await repository.findById(user.id);

        if (!completeUser) {
          throw notFoundError();
        }

        return completeUser;
      },
    );

    return mapUser(createdUser);
  }

  async update(
    userId: string,
    input: UpdateUserInput,
    actorId: string,
  ): Promise<UserSummary> {
    const existingUser = await this.repository.findById(userId);

    if (!existingUser) {
      throw notFoundError();
    }

    if (input.email && input.email !== existingUser.correo) {
      await this.assertEmailAvailable(input.email);
    }

    await this.assertReferences(input.roleIds, input.units);

    const updatedUser = await withAuditContext(
      actorId,
      async (transaction) => {
        const repository = new UserRepository(transaction);

        if (input.name !== undefined || input.email !== undefined) {
          await repository.updateUser(userId, {
            nombre: input.name,
            correo: input.email,
          });
        }

        if (input.roleIds !== undefined) {
          await repository.replaceRoles(userId, input.roleIds);
        }

        if (input.units !== undefined) {
          await repository.replaceUnits(userId, input.units);
        }

        await repository.recordAudit({
          usuario_id: actorId,
          accion: "actualizar",
          entidad: "usuarios",
          entidad_id: userId,
          resultado: "exitoso",
          detalles: {
            roles_actualizados: input.roleIds !== undefined,
            unidades_actualizadas: input.units !== undefined,
          },
        });

        const user = await repository.findById(userId);

        if (!user) {
          throw notFoundError();
        }

        return user;
      },
    );

    return mapUser(updatedUser);
  }

  async deactivate(userId: string, actorId: string): Promise<void> {
    const existingUser = await this.repository.findById(userId);

    if (!existingUser) {
      throw notFoundError();
    }

    if (existingUser.estado === "inactivo") {
      return;
    }

    const now = new Date();

    await withAuditContext(actorId, async (transaction) => {
      const repository = new UserRepository(transaction);
      await repository.updateUser(userId, { estado: "inactivo" });
      await repository.revokeActiveSessions(userId, now);
      await repository.recordAudit({
        usuario_id: actorId,
        accion: "desactivar",
        entidad: "usuarios",
        entidad_id: userId,
        resultado: "exitoso",
        detalles: {
          sesiones_revocadas: true,
        },
      });
    });
  }

  async resetPassword(
    userId: string,
    input: ResetPasswordInput,
    actorId: string,
  ): Promise<void> {
    const existingUser = await this.repository.findById(userId);

    if (!existingUser) {
      throw notFoundError();
    }

    const now = new Date();
    const passwordHash = await this.passwordHasher.hash(input.password);

    await withAuditContext(actorId, async (transaction) => {
      const repository = new UserRepository(transaction);
      await repository.updateUser(userId, {
        password_hash: passwordHash,
        debe_cambiar_password: true,
        password_changed_at: now,
      });
      await repository.revokeActiveSessions(userId, now);
      await repository.recordAudit({
        usuario_id: actorId,
        accion: "reset_password",
        entidad: "usuarios",
        entidad_id: userId,
        resultado: "exitoso",
        detalles: {
          sesiones_revocadas: true,
        },
      });
    });
  }

  private async assertEmailAvailable(email: string): Promise<void> {
    const existingUser = await this.repository.findByEmail(email);

    if (existingUser) {
      throw invalidReferenceError(
        "Ya existe un usuario con este correo.",
        "email",
      );
    }
  }

  private async assertReferences(
    roleIds: string[] | undefined,
    units:
      | Array<{
          unitId: string;
          isPrimary: boolean;
        }>
      | undefined,
  ): Promise<void> {
    if (roleIds !== undefined && roleIds.length > 0) {
      const activeRoles = await this.repository.findActiveRoleIds(roleIds);

      if (activeRoles.length !== roleIds.length) {
        throw invalidReferenceError(
          "Uno o más roles no existen o están inactivos.",
          "roleIds",
        );
      }
    }

    if (units !== undefined && units.length > 0) {
      const unitIds = units.map(({ unitId }) => unitId);
      const activeUnits = await this.repository.findActiveUnitIds(unitIds);

      if (activeUnits.length !== unitIds.length) {
        throw invalidReferenceError(
          "Una o más unidades no existen o están inactivas.",
          "units",
        );
      }
    }
  }
}
