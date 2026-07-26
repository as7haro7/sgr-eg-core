import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { TransactionClient } from "@/lib/transaction";
import { authUserSelect } from "@/modules/auth/types/auth.types";

type AuthDatabaseClient = Pick<
  TransactionClient,
  "$queryRaw" | "bitacora" | "parametros_sistema" | "sesiones" | "usuarios"
>;

export class AuthRepository {
  constructor(private readonly database: AuthDatabaseClient = prisma) {}

  findUserByEmail(email: string) {
    return this.database.usuarios.findUnique({
      where: { correo: email },
      select: authUserSelect,
    });
  }

  findUserCredentialsByEmail(email: string) {
    return this.database.usuarios.findUnique({
      where: { correo: email },
      select: {
        id: true,
        password_hash: true,
        estado: true,
        deleted_at: true,
      },
    });
  }

  findUserById(userId: string) {
    return this.database.usuarios.findUnique({
      where: { id: userId },
      select: authUserSelect,
    });
  }

  findSessionByTokenHash(tokenHash: string) {
    return this.database.sesiones.findUnique({
      where: { token_hash: tokenHash },
      select: {
        id: true,
        usuario_id: true,
        estado: true,
        expira_at: true,
        revocada_at: true,
        usuarios: {
          select: authUserSelect,
        },
      },
    });
  }

  findUserStatusById(userId: string) {
    return this.database.usuarios.findUnique({
      where: { id: userId },
      select: {
        id: true,
        estado: true,
        deleted_at: true,
      },
    });
  }

  findUserCredentialsById(userId: string) {
    return this.database.usuarios.findUnique({
      where: { id: userId },
      select: {
        id: true,
        password_hash: true,
        estado: true,
        deleted_at: true,
      },
    });
  }

  createSession(data: Prisma.sesionesUncheckedCreateInput) {
    return this.database.sesiones.create({
      data,
      select: {
        id: true,
        emitida_at: true,
        expira_at: true,
      },
    });
  }

  async completeSuccessfulLogin(input: {
    userId: string;
    sessionId: string;
    tokenHash: string;
    issuedAt: Date;
    expiresAt: Date;
    ip?: string;
    userAgent?: string;
  }): Promise<boolean> {
    const rows = await this.database.$queryRaw<Array<{ completed: boolean }>>`
      WITH audit_context AS (
        SELECT set_config('app.user_id', ${input.userId}, true)
      ),
      active_user AS (
        SELECT usuarios.id
          FROM usuarios
          CROSS JOIN audit_context
         WHERE usuarios.id = ${input.userId}::uuid
           AND usuarios.estado = 'activo'
           AND usuarios.deleted_at IS NULL
         FOR UPDATE
      ),
      created_session AS (
        INSERT INTO sesiones (
          id, usuario_id, token_hash, estado, emitida_at, expira_at, ip, user_agent
        )
        SELECT
          ${input.sessionId}::uuid,
          active_user.id,
          ${input.tokenHash},
          'activa',
          ${input.issuedAt},
          ${input.expiresAt},
          CAST(${input.ip ?? null} AS inet),
          ${input.userAgent ?? null}
        FROM active_user
        RETURNING id, usuario_id
      ),
      updated_user AS (
        UPDATE usuarios
           SET ultimo_login = ${input.issuedAt},
               updated_at = now()
         WHERE id IN (SELECT id FROM active_user)
        RETURNING id
      ),
      recorded_event AS (
        INSERT INTO bitacora (
          usuario_id, accion, entidad, entidad_id, resultado, detalles, ip
        )
        SELECT
          created_session.usuario_id,
          'login',
          'sesiones',
          created_session.id,
          'exitoso',
          '{"evento":"inicio_sesion"}'::jsonb,
          CAST(${input.ip ?? null} AS inet)
        FROM created_session
        RETURNING id
      )
      SELECT EXISTS (SELECT 1 FROM recorded_event) AS completed
    `;

    return rows[0]?.completed ?? false;
  }

  revokeSession(tokenHash: string, revokedAt: Date) {
    return this.database.sesiones.updateMany({
      where: {
        token_hash: tokenHash,
        estado: "activa",
      },
      data: {
        estado: "revocada",
        revocada_at: revokedAt,
      },
    });
  }

  revokeActiveSessionsByUserId(userId: string, revokedAt: Date) {
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

  expireSession(sessionId: string) {
    return this.database.sesiones.updateMany({
      where: {
        id: sessionId,
        estado: "activa",
      },
      data: {
        estado: "expirada",
      },
    });
  }

  updateLastLogin(userId: string, loginAt: Date) {
    return this.database.usuarios.update({
      where: { id: userId },
      data: { ultimo_login: loginAt },
      select: { id: true },
    });
  }

  updatePassword(userId: string, passwordHash: string, changedAt: Date) {
    return this.database.usuarios.update({
      where: { id: userId },
      data: {
        password_hash: passwordHash,
        debe_cambiar_password: false,
        password_changed_at: changedAt,
      },
      select: { id: true },
    });
  }

  getSessionDurationParameter() {
    return this.database.parametros_sistema.findUnique({
      where: { clave: "sesion_minutos" },
      select: { valor: true },
    });
  }

  recordAudit(data: Prisma.bitacoraUncheckedCreateInput) {
    return this.database.bitacora.create({
      data,
      select: { id: true },
    });
  }
}
