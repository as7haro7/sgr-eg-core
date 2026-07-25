import { loadEnvFile } from "node:process";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

try {
  loadEnvFile(".env");
} catch (error) {
  if (
    !(error instanceof Error) ||
    !("code" in error) ||
    error.code !== "ENOENT"
  ) {
    throw error;
  }
}

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    env: {
      DATABASE_URL:
        process.env.DATABASE_URL ??
        "postgresql://test:test@localhost:5432/test",
      DIRECT_URL:
        process.env.DIRECT_URL ??
        "postgresql://test:test@localhost:5432/test",
      AUTH_JWT_SECRET:
        process.env.AUTH_JWT_SECRET ??
        "test-secret-with-at-least-32-characters",
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
    },
  },
});
