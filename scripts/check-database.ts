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
  await client.connect();
  const tables = await client.query<{ table_name: string }>(
    `SELECT table_name
       FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN (
          'usuarios', 'sesiones', 'parametros_sistema', 'bitacora'
        )
      ORDER BY table_name`,
  );
  const columns = await client.query<{
    table_name: string;
    column_name: string;
  }>(
    `SELECT table_name, column_name
       FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name IN ('usuarios', 'sesiones')
      ORDER BY table_name, ordinal_position`,
  );
  const demo = await client.query<{ demo_admins: number }>(
    `SELECT count(1)::int AS demo_admins
       FROM usuarios
      WHERE correo = 'admin.sgr@gmail.com'`,
  );
  const migrations = await client.query<{ migration_name: string }>(
    `SELECT migration_name
       FROM _prisma_migrations
      WHERE finished_at IS NOT NULL
        AND rolled_back_at IS NULL
      ORDER BY finished_at`,
  ).catch(() => ({ rows: [] }));
  const appetiteGuard = await client.query<{
    constraint_present: boolean;
    overlapping_pairs: number;
  }>(
    `SELECT
       EXISTS (
         SELECT 1
           FROM pg_constraint
          WHERE conname = 'ex_apetito_sin_solapamiento'
            AND conrelid = 'apetitos_riesgo'::regclass
       ) AS constraint_present,
       (
         SELECT count(1)::int
           FROM apetitos_riesgo current_appetite
           JOIN apetitos_riesgo other_appetite
             ON current_appetite.id < other_appetite.id
            AND current_appetite.categoria_id = other_appetite.categoria_id
            AND current_appetite.unidad_id IS NOT DISTINCT FROM other_appetite.unidad_id
            AND daterange(
                  current_appetite.vigente_desde,
                  COALESCE(current_appetite.vigente_hasta, 'infinity'::date),
                  '[]'
                ) &&
                daterange(
                  other_appetite.vigente_desde,
                  COALESCE(other_appetite.vigente_hasta, 'infinity'::date),
                  '[]'
                )
       ) AS overlapping_pairs`,
  );

  process.stdout.write(
    `${JSON.stringify(
      {
        status: "reachable",
        tables: tables.rows.map(({ table_name }) => table_name),
        columns: Object.groupBy(
          columns.rows,
          ({ table_name }) => table_name,
        ),
        demoAdminCount: demo.rows[0]?.demo_admins ?? 0,
        appliedMigrations: migrations.rows.map(
          ({ migration_name }) => migration_name,
        ),
        appetiteOverlapGuard:
          appetiteGuard.rows[0]?.constraint_present ?? false,
        appetiteOverlappingPairs:
          appetiteGuard.rows[0]?.overlapping_pairs ?? 0,
      },
      null,
      2,
    )}\n`,
  );
} finally {
  await client.end().catch(() => undefined);
}
