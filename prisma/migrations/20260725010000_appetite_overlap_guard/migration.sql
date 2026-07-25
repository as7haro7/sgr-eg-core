-- También es segura para bases creadas previamente con schema_SGR-EG.sql.
CREATE EXTENSION IF NOT EXISTS "btree_gist";

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'ex_apetito_sin_solapamiento'
       AND conrelid = 'apetitos_riesgo'::regclass
  ) THEN
    ALTER TABLE apetitos_riesgo
      ADD CONSTRAINT ex_apetito_sin_solapamiento
      EXCLUDE USING gist (
        categoria_id WITH =,
        (
          COALESCE(
            unidad_id,
            '00000000-0000-0000-0000-000000000000'::uuid
          )
        ) WITH =,
        (
          daterange(
            vigente_desde,
            COALESCE(vigente_hasta, 'infinity'::date),
            '[]'
          )
        ) WITH &&
      );
  END IF;
END
$$;
