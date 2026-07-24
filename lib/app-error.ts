import type { ErrorDetail } from "@/types/api-response";

export type AppErrorCode =
  | "AUTHENTICATION_REQUIRED"
  | "FORBIDDEN"
  | "INTERNAL_ERROR"
  | "INVALID_CURRENT_PASSWORD"
  | "INVALID_CREDENTIALS"
  | "NOT_FOUND"
  | "PASSWORD_CHANGE_REQUIRED"
  | "SESSION_EXPIRED"
  | "SESSION_REVOKED"
  | "VALIDATION_ERROR";

export class AppError extends Error {
  constructor(
    public readonly code: AppErrorCode,
    message: string,
    public readonly statusCode: number,
    public readonly details: ErrorDetail[] = [],
  ) {
    super(message);
    this.name = "AppError";
  }
}
