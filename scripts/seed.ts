import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { Client } from "pg";

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DIRECT_URL o DATABASE_URL debe estar configurada.");
}

const client = new Client({
  connectionString,
  ssl:
    connectionString.includes("localhost") ||
    connectionString.includes("127.0.0.1")
      ? false
      : { rejectUnauthorized: false },
});

try {
  const sql = await readFile(
    resolve(process.cwd(), "prisma", "demo-data.sql"),
    "utf8",
  );
  await client.connect();
  await client.query(sql);
  process.stdout.write("Datos de demostración aplicados correctamente.\n");
} finally {
  await client.end().catch(() => undefined);
}
