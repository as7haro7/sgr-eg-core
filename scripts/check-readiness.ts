import { spawnSync } from "node:child_process";

import { Client } from "pg";

type Check = {
  name: string;
  ok: boolean;
  detail: string;
};

const configured = (name: string) => {
  const value = process.env[name]?.trim();
  return Boolean(value && !value.includes("YOUR_") && !value.includes("REPLACE_"));
};

const commandAvailable = (command: string) => {
  const result = spawnSync(command, ["--version"], {
    encoding: "utf8",
    windowsHide: true,
  });
  return result.status === 0;
};

const checks: Check[] = [
  {
    name: "Autenticación",
    ok: configured("AUTH_JWT_SECRET"),
    detail: "AUTH_JWT_SECRET configurado",
  },
  {
    name: "Storage de evidencias",
    ok:
      configured("SUPABASE_URL") &&
      configured("SUPABASE_SERVICE_ROLE_KEY") &&
      configured("SUPABASE_EVIDENCE_BUCKET"),
    detail: "URL, clave de servicio y bucket privado configurados",
  },
  {
    name: "Correo SMTP",
    ok:
      configured("SMTP_HOST") &&
      configured("SMTP_PORT") &&
      configured("SMTP_USER") &&
      configured("SMTP_PASSWORD") &&
      configured("SMTP_FROM"),
    detail: "Host, puerto, credenciales y remitente configurados",
  },
  {
    name: "Respaldo",
    ok: commandAvailable("pg_dump") && commandAvailable("pg_restore"),
    detail: "pg_dump y pg_restore disponibles en PATH",
  },
];

const connectionUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
let databaseOk = false;
let databaseDetail = "Conexión PostgreSQL y consulta SELECT 1";
if (connectionUrl) {
  const client = new Client({
    connectionString: connectionUrl,
    ssl:
      connectionUrl.includes("localhost") ||
      connectionUrl.includes("127.0.0.1")
        ? false
        : { rejectUnauthorized: false },
  });
  try {
    await client.connect();
    await client.query("SELECT 1");
    databaseOk = true;
  } catch (error) {
    databaseOk = false;
    databaseDetail =
      error instanceof Error
        ? `Falló la conexión (${error.name})`
        : "Falló la conexión";
  } finally {
    await client.end().catch(() => undefined);
  }
}
checks.unshift({
  name: "Base de datos",
  ok: databaseOk,
  detail: databaseDetail,
});

for (const check of checks) {
  process.stdout.write(
    `${check.ok ? "OK" : "FALTA"} · ${check.name}: ${check.detail}\n`,
  );
}

if (checks.some(({ ok }) => !ok)) {
  process.exitCode = 1;
} else {
  process.stdout.write("El entorno está listo para operación integral.\n");
}
