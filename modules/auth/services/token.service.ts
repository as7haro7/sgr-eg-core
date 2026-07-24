import { createHash, createHmac, timingSafeEqual } from "node:crypto";

import { getAuthEnv } from "@/config/env";
import { AppError } from "@/lib/app-error";
import type { SessionTokenClaims } from "@/modules/auth/types/auth.types";

const TOKEN_HEADER = {
  alg: "HS256",
  typ: "JWT",
} as const;

function encode(value: object): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function sign(content: string): string {
  return createHmac("sha256", getAuthEnv().AUTH_JWT_SECRET)
    .update(content)
    .digest("base64url");
}

function parseClaims(value: string): SessionTokenClaims {
  const claims = JSON.parse(
    Buffer.from(value, "base64url").toString("utf8"),
  ) as Partial<SessionTokenClaims>;

  if (
    typeof claims.sub !== "string" ||
    typeof claims.sid !== "string" ||
    typeof claims.iat !== "number" ||
    typeof claims.exp !== "number" ||
    claims.iss !== "sgr-eg" ||
    claims.aud !== "sgr-eg"
  ) {
    throw new Error("Invalid claims");
  }

  return claims as SessionTokenClaims;
}

export class TokenService {
  create(
    userId: string,
    sessionId: string,
    issuedAt: Date,
    expiresAt: Date,
  ): string {
    const claims: SessionTokenClaims = {
      sub: userId,
      sid: sessionId,
      iat: Math.floor(issuedAt.getTime() / 1_000),
      exp: Math.floor(expiresAt.getTime() / 1_000),
      iss: "sgr-eg",
      aud: "sgr-eg",
    };
    const unsignedToken = `${encode(TOKEN_HEADER)}.${encode(claims)}`;

    return `${unsignedToken}.${sign(unsignedToken)}`;
  }

  verify(token: string, now = new Date()): SessionTokenClaims {
    try {
      const [header, payload, signature, extra] = token.split(".");

      if (!header || !payload || !signature || extra) {
        throw new Error("Invalid token");
      }

      const parsedHeader = JSON.parse(
        Buffer.from(header, "base64url").toString("utf8"),
      ) as Partial<typeof TOKEN_HEADER>;

      if (
        parsedHeader.alg !== TOKEN_HEADER.alg ||
        parsedHeader.typ !== TOKEN_HEADER.typ
      ) {
        throw new Error("Invalid algorithm");
      }

      const expectedSignature = Buffer.from(
        sign(`${header}.${payload}`),
        "base64url",
      );
      const receivedSignature = Buffer.from(signature, "base64url");

      if (
        expectedSignature.length !== receivedSignature.length ||
        !timingSafeEqual(expectedSignature, receivedSignature)
      ) {
        throw new Error("Invalid signature");
      }

      const claims = parseClaims(payload);

      if (claims.exp <= Math.floor(now.getTime() / 1_000)) {
        throw new AppError(
          "SESSION_EXPIRED",
          "La sesión ha expirado.",
          401,
        );
      }

      return claims;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError(
        "AUTHENTICATION_REQUIRED",
        "La sesión no es válida.",
        401,
      );
    }
  }

  hash(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }
}
