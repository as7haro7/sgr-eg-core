import { mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const connectionUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!connectionUrl) {
  throw new Error("DIRECT_URL o DATABASE_URL debe estar configurada.");
}

const backupDirectory = resolve(process.cwd(), "backups");
mkdirSync(backupDirectory, { recursive: true });
const timestamp = new Date().toISOString().replaceAll(":", "-");
const target = join(backupDirectory, `sgr-eg-${timestamp}.dump`);
const result = spawnSync(
  "pg_dump",
  ["--format=custom", "--no-owner", "--file", target, connectionUrl],
  { stdio: "inherit" },
);
if (result.status !== 0) {
  throw new Error("pg_dump no pudo generar el respaldo.");
}
process.stdout.write(`Respaldo verificable creado en ${target}\n`);
