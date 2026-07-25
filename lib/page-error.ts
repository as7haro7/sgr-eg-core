import { notFound } from "next/navigation";

import { AppError } from "@/lib/app-error";

export async function notFoundOnMissing<T>(operation: Promise<T>): Promise<T> {
  try {
    return await operation;
  } catch (error) {
    if (
      error instanceof AppError &&
      (error.code === "NOT_FOUND" || error.statusCode === 404)
    ) {
      notFound();
    }
    throw error;
  }
}
