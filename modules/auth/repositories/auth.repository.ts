import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { TransactionClient } from "@/lib/transaction";
import { authUserSelect } from "@/modules/auth/types/auth.types";

type AuthDatabaseClient = Pick<
  TransactionClient,
  "bitacora" | "parametros_sistema" | "sesiones" | "usuarios"
>;

export class AuthRepository {
  constructor(private readonly database: AuthDatabaseClient = prisma) {}

  findUserByEmail(email: string) {
    return this.database.usuarios.findUnique({
      where: { correo: email },
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
