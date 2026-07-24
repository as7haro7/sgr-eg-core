import type {
  alcance_permiso,
  Prisma,
} from "@/generated/prisma/client";

export const authUserSelect = {
  id: true,
  nombre: true,
  correo: true,
  password_hash: true,
  estado: true,
  debe_cambiar_password: true,
  deleted_at: true,
  usuario_roles: {
    select: {
      roles: {
        select: {
          id: true,
          nombre: true,
          estado: true,
          permisos_rol: {
            select: {
              puede_crear: true,
              puede_leer: true,
              puede_actualizar: true,
              puede_desactivar: true,
              alcance: true,
              modulos: {
                select: {
                  codigo: true,
                },
              },
            },
          },
        },
      },
    },
  },
  usuario_unidades: {
    select: {
      unidad_id: true,
      es_principal: true,
      unidades_negocio: {
        select: {
          estado: true,
        },
      },
    },
  },
} satisfies Prisma.usuariosSelect;

export type AuthUserRecord = Prisma.usuariosGetPayload<{
  select: typeof authUserSelect;
}>;

export interface AuthPermission {
  roleId: string;
  module: string;
  canCreate: boolean;
  canRead: boolean;
  canUpdate: boolean;
  canDeactivate: boolean;
  scope: alcance_permiso;
}

export interface AuthPrincipal {
  userId: string;
  name: string;
  email: string;
  roleIds: string[];
  unitIds: string[];
  primaryUnitId: string | null;
  permissions: AuthPermission[];
  mustChangePassword: boolean;
}

export interface SessionTokenClaims {
  sub: string;
  sid: string;
  iat: number;
  exp: number;
  iss: "sgr-eg";
  aud: "sgr-eg";
}

export interface AuthSession {
  token: string;
  expiresAt: Date;
  principal: AuthPrincipal;
}

export interface AuthRequestContext {
  ip?: string;
  userAgent?: string;
}
