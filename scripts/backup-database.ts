import { mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { postgresTool } from "./postgres-tools.ts";

const connectionUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!connectionUrl) {
  throw new Error("DIRECT_URL o DATABASE_URL debe estar configurada.");
}

const backupDirectory = resolve(process.cwd(), "backups");
mkdirSync(backupDirectory, { recursive: true });
const timestamp = new Date().toISOString().replaceAll(":", "-");
const target = join(backupDirectory, `sgr-eg-${timestamp}.dump`);
const pgDump = postgresTool("pg_dump");
const pgRestore = postgresTool("pg_restore");
const result = spawnSync(
  pgDump,
  ["--format=custom", "--no-owner", "--file", target, connectionUrl],
  { stdio: "inherit" },
);
if (result.status !== 0) {
  if (result.error && "code" in result.error && result.error.code === "ENOENT") {
    throw new Error(
      "pg_dump no está instalado o no está disponible en PATH. Instala las herramientas cliente de PostgreSQL 16.",
    );
  }
  throw new Error("pg_dump no pudo generar el respaldo.");
}
const verification = spawnSync(pgRestore, ["--list", target], {
  stdio: "inherit",
});
if (verification.status !== 0) {
  throw new Error(
    "El archivo fue generado, pero pg_restore no pudo verificar su catálogo.",
  );
}
process.stdout.write(`Respaldo verificable creado en ${target}\n`);
