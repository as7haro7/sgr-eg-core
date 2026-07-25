import { AppError } from "@/lib/app-error";
import { withAuditContext } from "@/lib/transaction";
import { RoleRepository } from "@/modules/roles/repositories/role.repository";
import type { RoleOption } from "@/modules/roles/types/role.types";
import type {
  CreateRoleInput,
  UpdateRoleInput,
} from "@/modules/roles/validators/role.validator";

type RoleRecord = NonNullable<
  Awaited<ReturnType<RoleRepository["findById"]>>
>;

function mapRole(role: RoleRecord): RoleOption {
  return {
    id: role.id,
    name: role.nombre,
    description: role.descripcion,
    permissions: role.permisos_rol.map((permission) => ({
      moduleCode: permission.modulos.codigo,
      moduleName: permission.modulos.nombre,
      canCreate: permission.puede_crear,
      canRead: permission.puede_leer,
      canUpdate: permission.puede_actualizar,
      canDeactivate: permission.puede_desactivar,
      scope: permission.alcance,
    })),
  };
}

export class RoleService {
  constructor(private readonly repository = new RoleRepository()) {}

  async listActive(): Promise<RoleOption[]> {
    return (await this.repository.listActive()).map(mapRole);
  }

  async create(input: CreateRoleInput, actorId: string): Promise<RoleOption> {
    if (await this.repository.findByName(input.name)) {
      throw new AppError("CONFLICT", "Ya existe un rol con ese nombre.", 409);
    }
    return withAuditContext(actorId, async (transaction) => {
      const repository = new RoleRepository(transaction);
      const permissions = await this.resolvePermissions(
        input.permissions,
        repository,
      );
      const role = await repository.create({
        nombre: input.name,
        descripcion: input.description,
        estado: "activo",
      });
      await repository.replacePermissions(role.id, permissions);
      await repository.recordAudit({
        usuario_id: actorId,
        accion: "crear",
        entidad: "roles",
        entidad_id: role.id,
        detalles: { modulos: input.permissions.map((item) => item.moduleCode) },
      });
      return mapRole((await repository.findById(role.id))!);
    });
  }

  async update(
    roleId: string,
    input: UpdateRoleInput,
    actorId: string,
  ): Promise<RoleOption> {
    const existing = await this.repository.findById(roleId);
    if (!existing) throw new AppError("NOT_FOUND", "El rol no existe.", 404);
    if (existing.nombre === "administrador") {
      throw new AppError(
        "CONFLICT",
        "El rol administrador base no puede modificarse.",
        409,
      );
    }
    return withAuditContext(actorId, async (transaction) => {
      const repository = new RoleRepository(transaction);
      await repository.update(roleId, {
        nombre: input.name,
        descripcion: input.description,
      });
      if (input.permissions) {
        await repository.replacePermissions(
          roleId,
          await this.resolvePermissions(input.permissions, repository),
        );
      }
      await repository.recordAudit({
        usuario_id: actorId,
        accion: "actualizar",
        entidad: "roles",
        entidad_id: roleId,
        detalles: { permisos_actualizados: input.permissions !== undefined },
      });
      return mapRole((await repository.findById(roleId))!);
    });
  }

  async deactivate(roleId: string, actorId: string): Promise<void> {
    const existing = await this.repository.findById(roleId);
    if (!existing) throw new AppError("NOT_FOUND", "El rol no existe.", 404);
    if (existing.nombre === "administrador") {
      throw new AppError(
        "CONFLICT",
        "El rol administrador base no puede desactivarse.",
        409,
      );
    }
    await withAuditContext(actorId, async (transaction) => {
      const repository = new RoleRepository(transaction);
      await repository.update(roleId, { estado: "inactivo" });
      await repository.recordAudit({
        usuario_id: actorId,
        accion: "desactivar",
        entidad: "roles",
        entidad_id: roleId,
        detalles: {},
      });
    });
  }

  private async resolvePermissions(
    permissions: CreateRoleInput["permissions"],
    repository: RoleRepository,
  ) {
    const modules = await repository.findModules(
      permissions.map(({ moduleCode }) => moduleCode),
    );
    if (modules.length !== permissions.length) {
      throw new AppError(
        "VALIDATION_ERROR",
        "Uno o más módulos de permiso no existen.",
        400,
      );
    }
    const idByCode = new Map(
      modules.map(({ codigo, id }) => [codigo, id]),
    );
    return permissions.map((permission) => ({
      moduleId: idByCode.get(permission.moduleCode)!,
      canCreate: permission.canCreate,
      canRead: permission.canRead,
      canUpdate: permission.canUpdate,
      canDeactivate: permission.canDeactivate,
      scope: permission.scope,
    }));
  }
}
