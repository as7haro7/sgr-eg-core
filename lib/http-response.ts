import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { AppError } from "@/lib/app-error";
import { logger } from "@/lib/logger";
import type { ApiResponse, ErrorDetail } from "@/types/api-response";

export function successResponse<T>(
  data: T,
  message: string,
  status = 200,
): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    {
      data,
      message,
      errors: [],
    },
    { status },
  );
}

export function errorResponse(
  error: unknown,
): NextResponse<ApiResponse<never>> {
  if (error instanceof ZodError) {
    const errors: ErrorDetail[] = error.issues.map((issue) => ({
      code: "VALIDATION_ERROR",
      message: issue.message,
      field: issue.path.join(".") || undefined,
    }));

    return NextResponse.json(
      {
        data: null,
        message: "Los datos enviados no son válidos.",
        errors,
      },
      { status: 400 },
    );
  }

  if (error instanceof AppError) {
    return NextResponse.json(
      {
        data: null,
        message: error.message,
        errors:
          error.details.length > 0
            ? error.details
            : [{ code: error.code, message: error.message }],
      },
      { status: error.statusCode },
    );
  }

  logger.error("Unhandled server error", {
    errorName: error instanceof Error ? error.name : "UnknownError",
  });

  return NextResponse.json(
    {
      data: null,
      message: "Ocurrió un error interno.",
      errors: [
        {
          code: "INTERNAL_ERROR",
          message: "No fue posible completar la operación.",
        },
      ],
    },
    { status: 500 },
  );
}
