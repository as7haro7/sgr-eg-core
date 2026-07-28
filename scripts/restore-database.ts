import { existsSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { postgresTool } from "./postgres-tools.ts";

const connectionUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
const input = process.argv[2];
if (!connectionUrl || !input) {
  throw new Error("Uso: npm run db:restore -- backups/archivo.dump");
}
if (process.env.ALLOW_DB_RESTORE !== "yes") {
  throw new Error("Define ALLOW_DB_RESTORE=yes para confirmar la restauración.");
}
const backupDirectory = resolve(process.cwd(), "backups");
const source = resolve(process.cwd(), input);
const relativeSource = relative(backupDirectory, source);
if (
  relativeSource.startsWith("..") ||
  isAbsolute(relativeSource) ||
  relativeSource === ""
) {
  throw new Error("El respaldo debe estar dentro del directorio backups.");
}
if (!existsSync(source)) {
  throw new Error("El archivo de respaldo no existe.");
}
const pgRestore = postgresTool("pg_restore");
const verification = spawnSync(pgRestore, ["--list", source], {
  stdio: "inherit",
});
if (verification.status !== 0) {
  if (
    verification.error &&
    "code" in verification.error &&
    verification.error.code === "ENOENT"
  ) {
    throw new Error(
      "pg_restore no está instalado o no está disponible en PATH. Instala las herramientas cliente de PostgreSQL 16.",
    );
  }
  throw new Error("El archivo no es un respaldo PostgreSQL válido.");
}
const result = spawnSync(
  pgRestore,
  ["--exit-on-error", "--no-owner", "--dbname", connectionUrl, source],
  { stdio: "inherit" },
);
if (result.status !== 0) {
  throw new Error("pg_restore no pudo restaurar el respaldo.");
}
process.stdout.write("Respaldo restaurado correctamente.\n");
