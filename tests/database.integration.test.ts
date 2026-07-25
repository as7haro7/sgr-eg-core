import { randomUUID } from "node:crypto";

import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const enabled = process.env.RUN_DB_TESTS === "true";
const databaseIt = enabled ? it : it.skip;
let client: Client;

describe("Integridad PostgreSQL", () => {
  beforeAll(async () => {
    if (!enabled) return;
    client = new Client({
      connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
    });
    await client.connect();
  });

  afterAll(async () => {
    await client?.end();
  });

  databaseIt("recalcula el residual al crear un control", async () => {
    await client.query("BEGIN");
    try {
      const riskId = randomUUID();
      await client.query(
        `INSERT INTO riesgos (
          id, titulo, descripcion, causas, consecuencias, objetivos_afectados,
          categoria_id, unidad_id, propietario_id, creado_por,
          probabilidad, impacto
        ) VALUES (
          $1, 'Riesgo integración', 'Prueba', 'Causa', 'Consecuencia', 'Objetivo',
          (SELECT id FROM categorias_riesgo LIMIT 1),
          '11000000-0000-4000-8000-000000000001',
          '20000000-0000-4000-8000-000000000001',
          '20000000-0000-4000-8000-000000000001', 5, 5
        )`,
        [riskId],
      );
      await client.query(
        `INSERT INTO controles
          (riesgo_id, descripcion, tipo, efectividad, es_clave)
         VALUES ($1, 'Control integración', 'preventivo', 50, true)`,
        [riskId],
      );
      const result = await client.query<{ nivel_residual: string }>(
        "SELECT nivel_residual FROM riesgos WHERE id = $1",
        [riskId],
      );
      expect(Number(result.rows[0].nivel_residual)).toBe(12.5);
    } finally {
      await client.query("ROLLBACK");
    }
  });

  databaseIt("rechaza evidencia sin exactamente una entidad", async () => {
    await expect(
      client.query(
        `INSERT INTO evidencias
          (tipo, nombre, referencia_url, autor_id)
         VALUES ('enlace', 'Inválida', 'https://example.com',
          '20000000-0000-4000-8000-000000000001')`,
      ),
    ).rejects.toThrow();
  });

  databaseIt("impide duplicar una alerta pendiente", async () => {
    await client.query("BEGIN");
    try {
      const riskId = (
        await client.query<{ id: string }>(
          "SELECT id FROM riesgos WHERE deleted_at IS NULL LIMIT 1",
        )
      ).rows[0].id;
      const data = [
        "AL-01",
        "alta",
        riskId,
        "20000000-0000-4000-8000-000000000001",
        "Alerta integración",
      ];
      await client.query(
        `INSERT INTO alertas
          (regla_codigo, severidad, riesgo_id, destinatario_id, mensaje)
         VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING`,
        data,
      );
      const duplicate = await client.query(
        `INSERT INTO alertas
          (regla_codigo, severidad, riesgo_id, destinatario_id, mensaje)
         VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING
         RETURNING id`,
        data,
      );
      expect(duplicate.rowCount).toBe(0);
    } finally {
      await client.query("ROLLBACK");
    }
  });

  databaseIt("mantiene inmutable la bitácora", async () => {
    const id = (
      await client.query<{ id: string }>(
        "SELECT id::text AS id FROM bitacora LIMIT 1",
      )
    ).rows[0].id;
    await expect(
      client.query("UPDATE bitacora SET resultado = 'alterado' WHERE id = $1", [
        id,
      ]),
    ).rejects.toThrow("inmutable");
  });
});
