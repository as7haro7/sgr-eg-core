import { randomUUID } from "node:crypto";

import { AppError } from "@/lib/app-error";
import { withAuditContext } from "@/lib/transaction";
import { AuthRepository } from "@/modules/auth/repositories/auth.repository";
import { buildAuthPrincipal } from "@/modules/auth/services/auth-principal.service";
import { PasswordHasher } from "@/modules/auth/services/password-hasher.service";
import { getSessionExpiration } from "@/modules/auth/services/session-policy.service";
import { TokenService } from "@/modules/auth/services/token.service";
import type {
  AuthPrincipal,
  AuthRequestContext,
  AuthSession,
} from "@/modules/auth/types/auth.types";
import type { LoginInput } from "@/modules/auth/validators/login.validator";
import type { ChangePasswordInput } from "@/modules/auth/validators/change-password.validator";

function invalidCredentialsError(): AppError {
  return new AppError(
    "INVALID_CREDENTIALS",
    "El correo o la contraseña no son válidos.",
    401,
  );
}

export class AuthService {
  constructor(
    private readonly repository = new AuthRepository(),
    private readonly passwordHasher = new PasswordHasher(),
    private readonly tokenService = new TokenService(),
  ) {}

  async login(
    input: LoginInput,
    context: AuthRequestContext = {},
  ): Promise<AuthSession> {
    const user = await this.repository.findUserByEmail(input.correo);

    if (!user) {
      await this.passwordHasher.hash(input.password);
      await this.recordFailedLogin(null, context);
      throw invalidCredentialsError();
    }

    const passwordIsValid = await this.passwordHasher.verify(
      input.password,
      user.password_hash,
    );
    const userIsActive =
      user.estado === "activo" && user.deleted_at === null;

    if (!passwordIsValid || !userIsActive) {
      await this.recordFailedLogin(user.id, context);
      throw invalidCredentialsError();
    }

    const sessionParameter =
      await this.repository.getSessionDurationParameter();
    const issuedAt = new Date();
    const expiresAt = getSessionExpiration(
      sessionParameter?.valor,
      issuedAt,
    );
    const sessionId = randomUUID();
    const token = this.tokenService.create(
      user.id,
      sessionId,
      issuedAt,
      expiresAt,
    );
    const tokenHash = this.tokenService.hash(token);

    await withAuditContext(user.id, async (transaction) => {
      const transactionRepository = new AuthRepository(transaction);
      const currentUser = await transactionRepository.findUserStatusById(
        user.id,
      );

      if (
        !currentUser ||
        currentUser.estado !== "activo" ||
        currentUser.deleted_at !== null
      ) {
        throw invalidCredentialsError();
      }

      await transactionRepository.createSession({
        id: sessionId,
        usuario_id: user.id,
        token_hash: tokenHash,
        estado: "activa",
        emitida_at: issuedAt,
        expira_at: expiresAt,
        ip: context.ip,
        user_agent: context.userAgent,
      });
      await transactionRepository.updateLastLogin(user.id, issuedAt);
      await transactionRepository.recordAudit({
        usuario_id: user.id,
        accion: "login",
        entidad: "sesiones",
        entidad_id: sessionId,
        resultado: "exitoso",
        detalles: {
          evento: "inicio_sesion",
        },
        ip: context.ip,
      });
    });

    return {
      token,
      expiresAt,
      principal: buildAuthPrincipal(user),
    };
  }

  async authenticate(token: string, now = new Date()): Promise<AuthPrincipal> {
    const claims = this.tokenService.verify(token, now);
    const tokenHash = this.tokenService.hash(token);
    const session = await this.repository.findSessionByTokenHash(tokenHash);

    if (
      !session ||
      session.id !== claims.sid ||
      session.usuario_id !== claims.sub
    ) {
      throw new AppError(
        "AUTHENTICATION_REQUIRED",
        "La sesión no es válida.",
        401,
      );
    }

    if (session.estado === "revocada") {
      throw new AppError(
        "SESSION_REVOKED",
        "La sesión fue revocada.",
        401,
      );
    }

    if (session.estado === "expirada" || session.expira_at <= now) {
      await this.repository.expireSession(session.id);
      throw new AppError(
        "SESSION_EXPIRED",
        "La sesión ha expirado.",
        401,
      );
    }

    if (
      session.usuarios.estado !== "activo" ||
      session.usuarios.deleted_at !== null
    ) {
      throw new AppError(
        "AUTHENTICATION_REQUIRED",
        "La sesión no es válida.",
        401,
      );
    }

    return buildAuthPrincipal(session.usuarios);
  }

  async logout(token: string, context: AuthRequestContext = {}): Promise<void> {
    const tokenHash = this.tokenService.hash(token);
    const session = await this.repository.findSessionByTokenHash(tokenHash);

    if (!session || session.estado !== "activa") {
      return;
    }

    const revokedAt = new Date();

    await withAuditContext(session.usuario_id, async (transaction) => {
      const transactionRepository = new AuthRepository(transaction);
      await transactionRepository.revokeSession(tokenHash, revokedAt);
      await transactionRepository.recordAudit({
        usuario_id: session.usuario_id,
        accion: "logout",
        entidad: "sesiones",
        entidad_id: session.id,
        resultado: "exitoso",
        detalles: {
          evento: "cierre_sesion",
        },
        ip: context.ip,
      });
    });
  }

  async changePassword(
    token: string,
    input: ChangePasswordInput,
    context: AuthRequestContext = {},
  ): Promise<void> {
    const principal = await this.authenticate(token);
    const user = await this.repository.findUserCredentialsById(
      principal.userId,
    );

    if (
      !user ||
      user.estado !== "activo" ||
      user.deleted_at !== null
    ) {
      throw new AppError(
        "AUTHENTICATION_REQUIRED",
        "La sesión no es válida.",
        401,
      );
    }

    const currentPasswordIsValid = await this.passwordHasher.verify(
      input.currentPassword,
      user.password_hash,
    );

    if (!currentPasswordIsValid) {
      throw new AppError(
        "INVALID_CURRENT_PASSWORD",
        "La contraseña actual no es válida.",
        400,
      );
    }

    const passwordHash = await this.passwordHasher.hash(input.newPassword);
    const changedAt = new Date();

    await withAuditContext(principal.userId, async (transaction) => {
      const transactionRepository = new AuthRepository(transaction);
      const currentUser =
        await transactionRepository.findUserCredentialsById(principal.userId);

      if (
        !currentUser ||
        currentUser.estado !== "activo" ||
        currentUser.deleted_at !== null
      ) {
        throw new AppError(
          "AUTHENTICATION_REQUIRED",
          "La sesión no es válida.",
          401,
        );
      }

      const passwordIsStillValid = await this.passwordHasher.verify(
        input.currentPassword,
        currentUser.password_hash,
      );

      if (!passwordIsStillValid) {
        throw new AppError(
          "INVALID_CURRENT_PASSWORD",
          "La contraseña actual no es válida.",
          400,
        );
      }

      await transactionRepository.updatePassword(
        principal.userId,
        passwordHash,
        changedAt,
      );
      await transactionRepository.revokeActiveSessionsByUserId(
        principal.userId,
        changedAt,
      );
      await transactionRepository.recordAudit({
        usuario_id: principal.userId,
        accion: "cambiar_password",
        entidad: "usuarios",
        entidad_id: principal.userId,
        resultado: "exitoso",
        detalles: {
          evento: "cambio_password_propio",
          sesiones_revocadas: true,
        },
        ip: context.ip,
      });
    });
  }

  private async recordFailedLogin(
    userId: string | null,
    context: AuthRequestContext,
  ): Promise<void> {
    await this.repository.recordAudit({
      accion: "login",
      entidad: "usuarios",
      entidad_id: userId,
      resultado: "fallido",
      detalles: {
        evento: "credenciales_invalidas",
      },
      ip: context.ip,
    });
  }
}
