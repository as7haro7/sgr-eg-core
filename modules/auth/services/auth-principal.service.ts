import type {
  AuthPrincipal,
  AuthUserRecord,
} from "@/modules/auth/types/auth.types";

export function buildAuthPrincipal(user: AuthUserRecord): AuthPrincipal {
  const activeRoles = user.usuario_roles
    .map(({ roles }) => roles)
    .filter((role) => role.estado === "activo");
  const activeUnits = user.usuario_unidades.filter(
    ({ unidades_negocio }) => unidades_negocio.estado === "activo",
  );

  return {
    userId: user.id,
    name: user.nombre,
    email: user.correo,
    roleIds: activeRoles.map((role) => role.id),
    unitIds: activeUnits.map(({ unidad_id }) => unidad_id),
    primaryUnitId:
      activeUnits.find(({ es_principal }) => es_principal)?.unidad_id ?? null,
    permissions: activeRoles.flatMap((role) =>
      role.permisos_rol.map((permission) => ({
        roleId: role.id,
        module: permission.modulos.codigo,
        canCreate: permission.puede_crear,
        canRead: permission.puede_leer,
        canUpdate: permission.puede_actualizar,
        canDeactivate: permission.puede_desactivar,
        scope: permission.alcance,
      })),
    ),
    mustChangePassword: user.debe_cambiar_password,
  };
}
