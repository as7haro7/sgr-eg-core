import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

function windowsInstallations(): string[] {
  const root = "C:\\Program Files\\PostgreSQL";
  if (!existsSync(root)) return [];

  return readdirSync(root)
    .filter((entry) => /^\d+$/.test(entry))
    .sort((left, right) => Number(right) - Number(left))
    .map((version) => join(root, version, "bin"));
}

export function postgresTool(name: "pg_dump" | "pg_restore"): string {
  const executable = process.platform === "win32" ? `${name}.exe` : name;
  const configuredDirectory = process.env.PG_BIN?.trim();
  const candidates = [
    ...(configuredDirectory ? [configuredDirectory] : []),
    ...(process.platform === "win32" ? windowsInstallations() : []),
  ];
  const discovered = candidates
    .map((directory) => join(directory, executable))
    .find(existsSync);

  return discovered ?? name;
}
