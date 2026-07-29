-- Índices para las rutas de detalle, listados y relaciones más consultadas.
-- IF NOT EXISTS mantiene la migración segura en ambientes restaurados.
CREATE INDEX IF NOT EXISTS idx_acciones_plan
  ON acciones_mitigacion(plan_id, fecha_limite)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_auditoria_equipo_usuario
  ON auditoria_equipo(usuario_id, auditoria_id);

CREATE INDEX IF NOT EXISTS idx_auditorias_listado
  ON auditorias(unidad_id, estado, fecha_inicio)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_bitacora_fecha
  ON bitacora(fecha);

CREATE INDEX IF NOT EXISTS idx_evaluaciones_listado
  ON evaluaciones_cumplimiento(unidad_id, resultado, periodo_inicio)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_hallazgos_auditoria
  ON hallazgos(auditoria_id, created_at)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_normativas_vigencia
  ON normativas(estado, vigencia_fin)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_planes_riesgo
  ON planes_mitigacion(riesgo_id, fecha_limite)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_requisitos_normativa
  ON requisitos(normativa_id, vigente, vigencia_fin)
  WHERE deleted_at IS NULL;
