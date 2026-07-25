-- ============================================================================
-- SGR-EG - Esquema PostgreSQL 16 / Supabase
-- Implementa integridad, trazabilidad y reglas descritas en Requisitos_SGR-EG.md.
-- La aplicación debe establecer SET LOCAL app.user_id = '<uuid>' por transacción.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- TIPOS ----------------------------------------------------------------------
CREATE TYPE estado_activo AS ENUM ('activo', 'inactivo');
CREATE TYPE alcance_permiso AS ENUM ('global', 'unidad', 'propio', 'asignado');
CREATE TYPE estado_sesion AS ENUM ('activa', 'revocada', 'expirada');
CREATE TYPE estado_riesgo AS ENUM (
  'identificado', 'en_evaluacion', 'abierto', 'en_tratamiento',
  'monitoreo', 'aceptado', 'cerrado', 'cancelado'
);
CREATE TYPE estado_plan AS ENUM ('activo', 'vencido', 'completado', 'cancelado');
CREATE TYPE tipo_control AS ENUM ('preventivo', 'detectivo', 'correctivo');
CREATE TYPE estado_auditoria AS ENUM ('planificada', 'en_ejecucion', 'cerrada', 'cancelada');
CREATE TYPE severidad_hallazgo AS ENUM ('baja', 'media', 'alta', 'critica');
CREATE TYPE estado_hallazgo AS ENUM ('abierto', 'en_seguimiento', 'cerrado');
CREATE TYPE estado_normativa AS ENUM ('vigente', 'derogada');
CREATE TYPE criticidad_requisito AS ENUM ('baja', 'media', 'alta');
CREATE TYPE resultado_evaluacion AS ENUM (
  'conforme', 'parcialmente_conforme', 'no_conforme', 'no_aplicable'
);
CREATE TYPE severidad_alerta AS ENUM ('media', 'alta', 'critica');
CREATE TYPE estado_alerta AS ENUM ('pendiente', 'atendida', 'descartada');
CREATE TYPE tipo_evidencia AS ENUM ('archivo', 'enlace');

-- SEGURIDAD, ORGANIZACIÓN Y CONFIGURACIÓN ------------------------------------
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(50) NOT NULL UNIQUE,
  descripcion TEXT,
  estado estado_activo NOT NULL DEFAULT 'activo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE modulos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo VARCHAR(40) NOT NULL UNIQUE,
  nombre VARCHAR(100) NOT NULL
);

CREATE TABLE permisos_rol (
  rol_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  modulo_id UUID NOT NULL REFERENCES modulos(id) ON DELETE CASCADE,
  puede_crear BOOLEAN NOT NULL DEFAULT false,
  puede_leer BOOLEAN NOT NULL DEFAULT false,
  puede_actualizar BOOLEAN NOT NULL DEFAULT false,
  puede_desactivar BOOLEAN NOT NULL DEFAULT false,
  alcance alcance_permiso NOT NULL DEFAULT 'unidad',
  PRIMARY KEY (rol_id, modulo_id)
);

CREATE TABLE paises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(100) NOT NULL UNIQUE,
  codigo_iso CHAR(2) NOT NULL UNIQUE CHECK (codigo_iso ~ '^[A-Z]{2}$'),
  estado estado_activo NOT NULL DEFAULT 'activo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE unidades_negocio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(150) NOT NULL,
  pais_id UUID NOT NULL REFERENCES paises(id) ON DELETE RESTRICT,
  moneda CHAR(3) NOT NULL DEFAULT 'USD' CHECK (moneda ~ '^[A-Z]{3}$'),
  estado estado_activo NOT NULL DEFAULT 'activo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (nombre, pais_id)
);

CREATE TABLE usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(150) NOT NULL,
  correo VARCHAR(254) NOT NULL,
  password_hash TEXT NOT NULL,
  estado estado_activo NOT NULL DEFAULT 'activo',
  debe_cambiar_password BOOLEAN NOT NULL DEFAULT false,
  password_changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ultimo_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT uq_usuario_correo UNIQUE (correo),
  CHECK (correo = lower(correo))
);

CREATE TABLE usuario_roles (
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  rol_id UUID NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (usuario_id, rol_id)
);

CREATE TABLE usuario_unidades (
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  unidad_id UUID NOT NULL REFERENCES unidades_negocio(id) ON DELETE RESTRICT,
  es_principal BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (usuario_id, unidad_id)
);
CREATE UNIQUE INDEX uq_usuario_unidad_principal
  ON usuario_unidades(usuario_id) WHERE es_principal;

CREATE TABLE sesiones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  token_hash TEXT NOT NULL UNIQUE,
  estado estado_sesion NOT NULL DEFAULT 'activa',
  emitida_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expira_at TIMESTAMPTZ NOT NULL,
  revocada_at TIMESTAMPTZ,
  ip INET,
  user_agent VARCHAR(500),
  CHECK (expira_at > emitida_at),
  CHECK ((estado = 'revocada') = (revocada_at IS NOT NULL))
);
CREATE INDEX idx_sesiones_usuario_estado ON sesiones(usuario_id, estado);

CREATE TABLE parametros_sistema (
  clave VARCHAR(80) PRIMARY KEY,
  valor JSONB NOT NULL,
  descripcion TEXT NOT NULL,
  actualizado_por UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RIESGOS --------------------------------------------------------------------
CREATE TABLE categorias_riesgo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(100) NOT NULL UNIQUE,
  descripcion TEXT,
  apetito_base NUMERIC(5,2) NOT NULL DEFAULT 10 CHECK (apetito_base BETWEEN 0 AND 25),
  estado estado_activo NOT NULL DEFAULT 'activo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE apetitos_riesgo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria_id UUID NOT NULL REFERENCES categorias_riesgo(id) ON DELETE RESTRICT,
  unidad_id UUID REFERENCES unidades_negocio(id) ON DELETE RESTRICT,
  umbral NUMERIC(5,2) NOT NULL CHECK (umbral BETWEEN 0 AND 25),
  vigente_desde DATE NOT NULL,
  vigente_hasta DATE,
  creado_por UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (vigente_hasta IS NULL OR vigente_hasta >= vigente_desde)
);
CREATE UNIQUE INDEX uq_apetito_vigencia
  ON apetitos_riesgo(categoria_id, COALESCE(unidad_id, '00000000-0000-0000-0000-000000000000'), vigente_desde);
ALTER TABLE apetitos_riesgo
  ADD CONSTRAINT ex_apetito_sin_solapamiento
  EXCLUDE USING gist (
    categoria_id WITH =,
    (COALESCE(unidad_id, '00000000-0000-0000-0000-000000000000'::uuid)) WITH =,
    (daterange(vigente_desde, COALESCE(vigente_hasta, 'infinity'::date), '[]')) WITH &&
  );

CREATE TABLE correlativos_riesgo (
  gestion SMALLINT PRIMARY KEY CHECK (gestion BETWEEN 2000 AND 9999),
  ultimo INTEGER NOT NULL CHECK (ultimo > 0)
);

CREATE OR REPLACE FUNCTION generar_codigo_riesgo()
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE v_gestion SMALLINT := extract(year FROM current_date); v_num INTEGER;
BEGIN
  INSERT INTO correlativos_riesgo(gestion, ultimo) VALUES (v_gestion, 1)
  ON CONFLICT (gestion) DO UPDATE SET ultimo = correlativos_riesgo.ultimo + 1
  RETURNING ultimo INTO v_num;
  RETURN format('R-%s-%s', v_gestion, lpad(v_num::text, 4, '0'));
END $$;

CREATE TABLE riesgos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo VARCHAR(30) NOT NULL UNIQUE DEFAULT generar_codigo_riesgo(),
  titulo VARCHAR(200) NOT NULL,
  descripcion TEXT NOT NULL,
  causas TEXT,
  consecuencias TEXT,
  objetivos_afectados TEXT,
  categoria_id UUID NOT NULL REFERENCES categorias_riesgo(id) ON DELETE RESTRICT,
  unidad_id UUID NOT NULL REFERENCES unidades_negocio(id) ON DELETE RESTRICT,
  propietario_id UUID REFERENCES usuarios(id) ON DELETE RESTRICT,
  creado_por UUID NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  probabilidad SMALLINT NOT NULL CHECK (probabilidad BETWEEN 1 AND 5),
  impacto SMALLINT NOT NULL CHECK (impacto BETWEEN 1 AND 5),
  nivel_inherente SMALLINT GENERATED ALWAYS AS (probabilidad * impacto) STORED,
  nivel_residual NUMERIC(6,2) NOT NULL DEFAULT 0 CHECK (nivel_residual BETWEEN 0 AND 25),
  exposicion_financiera NUMERIC(18,2) CHECK (exposicion_financiera IS NULL OR exposicion_financiera >= 0),
  moneda CHAR(3) CHECK (moneda IS NULL OR moneda ~ '^[A-Z]{3}$'),
  estado estado_riesgo NOT NULL DEFAULT 'identificado',
  justificacion_aceptacion TEXT,
  aceptado_por UUID REFERENCES usuarios(id) ON DELETE RESTRICT,
  aceptado_at TIMESTAMPTZ,
  fecha_revision DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  CHECK (codigo ~ '^R-[0-9]{4}-[0-9]{4,}$'),
  CHECK ((exposicion_financiera IS NULL) = (moneda IS NULL))
);
CREATE INDEX idx_riesgos_filtros ON riesgos(unidad_id, categoria_id, estado, created_at);
CREATE INDEX idx_riesgos_propietario ON riesgos(propietario_id) WHERE deleted_at IS NULL;

CREATE TABLE transiciones_riesgo (
  origen estado_riesgo NOT NULL,
  destino estado_riesgo NOT NULL,
  PRIMARY KEY (origen, destino)
);

CREATE OR REPLACE FUNCTION validar_riesgo()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.estado <> OLD.estado AND NOT EXISTS (
    SELECT 1 FROM transiciones_riesgo WHERE origen = OLD.estado AND destino = NEW.estado
  ) THEN
    RAISE EXCEPTION 'Transición de riesgo no permitida: % -> %', OLD.estado, NEW.estado;
  END IF;
  IF NEW.estado <> 'identificado' AND NEW.propietario_id IS NULL THEN
    RAISE EXCEPTION 'El riesgo requiere propietario para avanzar de Identificado';
  END IF;
  IF NEW.estado = 'aceptado' AND (
    nullif(btrim(NEW.justificacion_aceptacion), '') IS NULL OR
    NEW.aceptado_por IS NULL OR NEW.aceptado_at IS NULL OR NEW.fecha_revision IS NULL
  ) THEN
    RAISE EXCEPTION 'Aceptar un riesgo requiere justificación, aprobador, fecha y revisión';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_validar_riesgo BEFORE INSERT OR UPDATE ON riesgos
FOR EACH ROW EXECUTE FUNCTION validar_riesgo();

-- CONTROLES Y MITIGACIÓN ------------------------------------------------------
CREATE TABLE controles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  riesgo_id UUID NOT NULL REFERENCES riesgos(id) ON DELETE RESTRICT,
  descripcion VARCHAR(500) NOT NULL,
  tipo tipo_control NOT NULL,
  efectividad NUMERIC(5,2) NOT NULL CHECK (efectividad BETWEEN 0 AND 100),
  es_clave BOOLEAN NOT NULL DEFAULT false,
  estado estado_activo NOT NULL DEFAULT 'activo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX idx_controles_riesgo ON controles(riesgo_id) WHERE deleted_at IS NULL;

CREATE TABLE planes_mitigacion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  riesgo_id UUID NOT NULL REFERENCES riesgos(id) ON DELETE RESTRICT,
  responsable_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  descripcion VARCHAR(500) NOT NULL,
  fecha_limite DATE NOT NULL,
  avance NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (avance BETWEEN 0 AND 100),
  estado estado_plan NOT NULL DEFAULT 'activo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX idx_planes_vencimiento ON planes_mitigacion(fecha_limite, estado) WHERE deleted_at IS NULL;

CREATE TABLE acciones_mitigacion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES planes_mitigacion(id) ON DELETE RESTRICT,
  descripcion VARCHAR(500) NOT NULL,
  responsable_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  fecha_limite DATE NOT NULL,
  avance NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (avance BETWEEN 0 AND 100),
  estado estado_plan NOT NULL DEFAULT 'activo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX idx_acciones_vencimiento ON acciones_mitigacion(fecha_limite, estado) WHERE deleted_at IS NULL;

CREATE OR REPLACE FUNCTION validar_fecha_limite()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.fecha_limite < NEW.created_at::date THEN
    RAISE EXCEPTION 'La fecha límite no puede ser anterior a la fecha de creación';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_fecha_plan BEFORE INSERT OR UPDATE OF fecha_limite ON planes_mitigacion
FOR EACH ROW EXECUTE FUNCTION validar_fecha_limite();
CREATE TRIGGER trg_fecha_accion BEFORE INSERT OR UPDATE OF fecha_limite ON acciones_mitigacion
FOR EACH ROW EXECUTE FUNCTION validar_fecha_limite();

CREATE OR REPLACE FUNCTION recalcular_residual(p_riesgo UUID)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE v_factor NUMERIC := 1; v_control RECORD;
BEGIN
  FOR v_control IN
    SELECT efectividad FROM controles
    WHERE riesgo_id = p_riesgo AND estado = 'activo' AND deleted_at IS NULL
  LOOP
    v_factor := v_factor * (1 - v_control.efectividad / 100);
  END LOOP;
  UPDATE riesgos
    SET nivel_residual = round(nivel_inherente * v_factor, 2), updated_at = now()
    WHERE id = p_riesgo;
END $$;

CREATE OR REPLACE FUNCTION disparar_recalculo_residual()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  PERFORM recalcular_residual(COALESCE(NEW.riesgo_id, OLD.riesgo_id));
  IF TG_OP = 'UPDATE' AND OLD.riesgo_id <> NEW.riesgo_id THEN
    PERFORM recalcular_residual(OLD.riesgo_id);
  END IF;
  RETURN COALESCE(NEW, OLD);
END $$;
CREATE TRIGGER trg_residual_control AFTER INSERT OR UPDATE OR DELETE ON controles
FOR EACH ROW EXECUTE FUNCTION disparar_recalculo_residual();

CREATE OR REPLACE FUNCTION inicializar_residual()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN PERFORM recalcular_residual(NEW.id); RETURN NEW; END $$;
CREATE TRIGGER trg_residual_riesgo AFTER INSERT OR UPDATE OF probabilidad, impacto ON riesgos
FOR EACH ROW EXECUTE FUNCTION inicializar_residual();

-- AUDITORÍAS -----------------------------------------------------------------
CREATE TABLE auditorias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  objetivo VARCHAR(500) NOT NULL,
  alcance TEXT NOT NULL,
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE,
  responsable_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  unidad_id UUID REFERENCES unidades_negocio(id) ON DELETE RESTRICT,
  estado estado_auditoria NOT NULL DEFAULT 'planificada',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  CHECK (fecha_fin IS NULL OR fecha_fin >= fecha_inicio)
);

CREATE TABLE auditoria_equipo (
  auditoria_id UUID NOT NULL REFERENCES auditorias(id) ON DELETE RESTRICT,
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  funcion VARCHAR(100),
  PRIMARY KEY (auditoria_id, usuario_id)
);

CREATE TABLE hallazgos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auditoria_id UUID NOT NULL REFERENCES auditorias(id) ON DELETE RESTRICT,
  riesgo_id UUID REFERENCES riesgos(id) ON DELETE RESTRICT,
  severidad severidad_hallazgo NOT NULL,
  condicion TEXT NOT NULL,
  recomendacion TEXT NOT NULL,
  respuesta TEXT,
  responsable_id UUID REFERENCES usuarios(id) ON DELETE RESTRICT,
  fecha_limite DATE,
  fecha_respuesta TIMESTAMPTZ,
  estado estado_hallazgo NOT NULL DEFAULT 'abierto',
  requiere_evidencia_cierre BOOLEAN NOT NULL DEFAULT true,
  cerrado_por UUID REFERENCES usuarios(id) ON DELETE RESTRICT,
  cerrado_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  CHECK (severidad <> 'critica' OR requiere_evidencia_cierre),
  CHECK ((estado = 'cerrado') = (cerrado_at IS NOT NULL))
);
CREATE INDEX idx_hallazgos_seguimiento ON hallazgos(estado, severidad, fecha_limite)
WHERE deleted_at IS NULL;

-- CUMPLIMIENTO ---------------------------------------------------------------
CREATE TABLE normativas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(200) NOT NULL,
  jurisdiccion VARCHAR(100) NOT NULL,
  pais_id UUID REFERENCES paises(id) ON DELETE RESTRICT,
  version VARCHAR(30) NOT NULL,
  vigencia_inicio DATE NOT NULL,
  vigencia_fin DATE,
  estado estado_normativa NOT NULL DEFAULT 'vigente',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  UNIQUE (nombre, jurisdiccion, version),
  CHECK (vigencia_fin IS NULL OR vigencia_fin >= vigencia_inicio)
);

CREATE TABLE requisitos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  normativa_id UUID NOT NULL REFERENCES normativas(id) ON DELETE RESTRICT,
  codigo VARCHAR(50) NOT NULL,
  descripcion TEXT NOT NULL,
  criticidad criticidad_requisito NOT NULL DEFAULT 'media',
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  requisito_raiz_id UUID REFERENCES requisitos(id) ON DELETE RESTRICT,
  vigencia_inicio DATE NOT NULL,
  vigencia_fin DATE,
  vigente BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  UNIQUE (normativa_id, codigo, version),
  CHECK (vigencia_fin IS NULL OR vigencia_fin >= vigencia_inicio)
);

CREATE TABLE evaluaciones_cumplimiento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requisito_id UUID NOT NULL REFERENCES requisitos(id) ON DELETE RESTRICT,
  unidad_id UUID NOT NULL REFERENCES unidades_negocio(id) ON DELETE RESTRICT,
  periodo_inicio DATE NOT NULL,
  periodo_fin DATE NOT NULL,
  resultado resultado_evaluacion NOT NULL,
  evaluador_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  observaciones TEXT,
  justificacion_no_aplicable TEXT,
  plan_accion TEXT,
  responsable_plan_id UUID REFERENCES usuarios(id) ON DELETE RESTRICT,
  fecha_limite_plan DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  CHECK (periodo_fin >= periodo_inicio),
  CHECK (resultado <> 'no_aplicable' OR nullif(btrim(justificacion_no_aplicable), '') IS NOT NULL),
  CHECK (resultado <> 'no_conforme' OR (
    nullif(btrim(plan_accion), '') IS NOT NULL AND
    responsable_plan_id IS NOT NULL AND fecha_limite_plan IS NOT NULL
  ))
);
CREATE UNIQUE INDEX uq_evaluacion_periodo
  ON evaluaciones_cumplimiento(requisito_id, unidad_id, periodo_inicio, periodo_fin)
  WHERE deleted_at IS NULL;

-- ALERTAS --------------------------------------------------------------------
CREATE TABLE reglas_alerta (
  codigo VARCHAR(10) PRIMARY KEY CHECK (codigo ~ '^AL-[0-9]{2}$'),
  nombre VARCHAR(150) NOT NULL,
  severidad severidad_alerta NOT NULL,
  activa BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE alertas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  regla_codigo VARCHAR(10) NOT NULL REFERENCES reglas_alerta(codigo) ON DELETE RESTRICT,
  severidad severidad_alerta NOT NULL,
  riesgo_id UUID REFERENCES riesgos(id) ON DELETE RESTRICT,
  control_id UUID REFERENCES controles(id) ON DELETE RESTRICT,
  plan_id UUID REFERENCES planes_mitigacion(id) ON DELETE RESTRICT,
  accion_id UUID REFERENCES acciones_mitigacion(id) ON DELETE RESTRICT,
  hallazgo_id UUID REFERENCES hallazgos(id) ON DELETE RESTRICT,
  normativa_id UUID REFERENCES normativas(id) ON DELETE RESTRICT,
  requisito_id UUID REFERENCES requisitos(id) ON DELETE RESTRICT,
  evaluacion_id UUID REFERENCES evaluaciones_cumplimiento(id) ON DELETE RESTRICT,
  destinatario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  mensaje VARCHAR(500) NOT NULL,
  estado estado_alerta NOT NULL DEFAULT 'pendiente',
  generada_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  atendida_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  CHECK (num_nonnulls(riesgo_id, control_id, plan_id, accion_id, hallazgo_id,
                      normativa_id, requisito_id, evaluacion_id) = 1),
  CHECK ((estado = 'atendida') = (atendida_at IS NOT NULL))
);
CREATE UNIQUE INDEX uq_alerta_pendiente
  ON alertas(
    regla_codigo, destinatario_id,
    COALESCE(riesgo_id, control_id, plan_id, accion_id, hallazgo_id,
             normativa_id, requisito_id, evaluacion_id)
  ) WHERE estado = 'pendiente' AND deleted_at IS NULL;
CREATE INDEX idx_alertas_bandeja ON alertas(destinatario_id, estado, severidad, generada_at);

CREATE TABLE alerta_historial (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alerta_id UUID NOT NULL REFERENCES alertas(id) ON DELETE RESTRICT,
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  evento VARCHAR(20) NOT NULL DEFAULT 'atencion'
    CHECK (evento IN ('atencion', 'reapertura', 'comentario', 'descarte')),
  comentario TEXT NOT NULL CHECK (nullif(btrim(comentario), '') IS NOT NULL),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION atender_alerta(p_alerta UUID, p_usuario UUID, p_comentario TEXT)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  IF nullif(btrim(p_comentario), '') IS NULL THEN
    RAISE EXCEPTION 'El comentario de atención es obligatorio';
  END IF;
  INSERT INTO alerta_historial(alerta_id, usuario_id, evento, comentario)
  SELECT id, p_usuario, 'atencion', p_comentario FROM alertas
  WHERE id = p_alerta AND destinatario_id = p_usuario AND estado = 'pendiente'
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Alerta inexistente, atendida o no autorizada'; END IF;
  UPDATE alertas SET estado = 'atendida', atendida_at = now() WHERE id = p_alerta;
END $$;

CREATE OR REPLACE FUNCTION reabrir_alerta(p_alerta UUID, p_usuario UUID, p_comentario TEXT)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  IF nullif(btrim(p_comentario), '') IS NULL THEN
    RAISE EXCEPTION 'La justificación de reapertura es obligatoria';
  END IF;
  INSERT INTO alerta_historial(alerta_id, usuario_id, evento, comentario)
  SELECT id, p_usuario, 'reapertura', p_comentario FROM alertas
  WHERE id = p_alerta AND estado IN ('atendida', 'descartada') FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Alerta inexistente o ya pendiente'; END IF;
  UPDATE alertas SET estado = 'pendiente', atendida_at = NULL WHERE id = p_alerta;
END $$;

CREATE OR REPLACE FUNCTION validar_atencion_alerta()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.estado = 'atendida' AND OLD.estado <> 'atendida' AND NOT EXISTS (
    SELECT 1 FROM alerta_historial
    WHERE alerta_id = NEW.id AND evento = 'atencion'
  ) THEN RAISE EXCEPTION 'La alerta requiere un comentario de atención'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_validar_atencion BEFORE UPDATE OF estado ON alertas
FOR EACH ROW EXECUTE FUNCTION validar_atencion_alerta();

-- EVIDENCIAS CON INTEGRIDAD REFERENCIAL --------------------------------------
CREATE TABLE evidencias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo tipo_evidencia NOT NULL,
  riesgo_id UUID REFERENCES riesgos(id) ON DELETE RESTRICT,
  control_id UUID REFERENCES controles(id) ON DELETE RESTRICT,
  plan_id UUID REFERENCES planes_mitigacion(id) ON DELETE RESTRICT,
  accion_id UUID REFERENCES acciones_mitigacion(id) ON DELETE RESTRICT,
  auditoria_id UUID REFERENCES auditorias(id) ON DELETE RESTRICT,
  hallazgo_id UUID REFERENCES hallazgos(id) ON DELETE RESTRICT,
  evaluacion_id UUID REFERENCES evaluaciones_cumplimiento(id) ON DELETE RESTRICT,
  nombre VARCHAR(255) NOT NULL,
  tipo_mime VARCHAR(150),
  tamano_bytes BIGINT,
  referencia_url TEXT NOT NULL,
  autor_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  CHECK (num_nonnulls(riesgo_id, control_id, plan_id, accion_id, auditoria_id,
                      hallazgo_id, evaluacion_id) = 1),
  CHECK (
    (tipo = 'archivo' AND tipo_mime IS NOT NULL AND tamano_bytes > 0) OR
    (tipo = 'enlace' AND tamano_bytes IS NULL)
  )
);
CREATE INDEX idx_evidencia_riesgo ON evidencias(riesgo_id) WHERE riesgo_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_evidencia_control ON evidencias(control_id) WHERE control_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_evidencia_plan ON evidencias(plan_id) WHERE plan_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_evidencia_accion ON evidencias(accion_id) WHERE accion_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_evidencia_auditoria ON evidencias(auditoria_id) WHERE auditoria_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_evidencia_hallazgo ON evidencias(hallazgo_id) WHERE hallazgo_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_evidencia_evaluacion ON evidencias(evaluacion_id) WHERE evaluacion_id IS NOT NULL AND deleted_at IS NULL;

CREATE OR REPLACE FUNCTION validar_evidencia()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE v_max BIGINT := 10485760;
BEGIN
  SELECT COALESCE((
    SELECT (valor #>> '{}')::BIGINT
    FROM parametros_sistema WHERE clave = 'evidencia_max_bytes'
  ), v_max) INTO v_max;
  IF NEW.tipo = 'archivo' AND NEW.tamano_bytes > v_max THEN
    RAISE EXCEPTION 'La evidencia excede el tamaño máximo permitido (% bytes)', v_max;
  END IF;
  IF NEW.tipo = 'archivo' AND (
    lower(NEW.tipo_mime) IN (
      'application/x-msdownload', 'application/x-executable',
      'application/x-dosexec', 'application/x-sh'
    ) OR lower(NEW.nombre) ~ '\.(exe|dll|bat|cmd|com|msi|ps1|sh|scr|jar)$'
  ) THEN
    RAISE EXCEPTION 'El tipo de archivo no está permitido';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_validar_evidencia BEFORE INSERT OR UPDATE ON evidencias
FOR EACH ROW EXECUTE FUNCTION validar_evidencia();

CREATE OR REPLACE FUNCTION validar_cierre_hallazgo()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.estado = 'cerrado' AND OLD.estado <> 'cerrado' AND
     NEW.requiere_evidencia_cierre AND NOT EXISTS (
       SELECT 1 FROM evidencias WHERE hallazgo_id = NEW.id AND deleted_at IS NULL
     ) THEN RAISE EXCEPTION 'No se puede cerrar el hallazgo sin evidencia'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_cierre_hallazgo BEFORE UPDATE OF estado ON hallazgos
FOR EACH ROW EXECUTE FUNCTION validar_cierre_hallazgo();

-- BITÁCORA, FECHAS E INMUTABILIDAD -------------------------------------------
CREATE TABLE bitacora (
  id BIGSERIAL PRIMARY KEY,
  usuario_id UUID REFERENCES usuarios(id) ON DELETE RESTRICT,
  accion VARCHAR(20) NOT NULL,
  entidad VARCHAR(60) NOT NULL,
  entidad_id UUID,
  resultado VARCHAR(20) NOT NULL DEFAULT 'exitoso',
  detalles JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip INET,
  fecha TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_bitacora_consulta ON bitacora(entidad, entidad_id, fecha);
CREATE INDEX idx_bitacora_usuario_fecha ON bitacora(usuario_id, fecha);

CREATE OR REPLACE FUNCTION usuario_contexto()
RETURNS UUID LANGUAGE plpgsql STABLE AS $$
DECLARE v TEXT;
BEGIN
  v := current_setting('app.user_id', true);
  IF v IS NULL OR v = '' THEN RETURN NULL; END IF;
  RETURN v::UUID;
EXCEPTION WHEN invalid_text_representation THEN RETURN NULL;
END $$;

CREATE OR REPLACE FUNCTION registrar_bitacora()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE v_old JSONB; v_new JSONB; v_id UUID;
BEGIN
  IF TG_OP <> 'INSERT' THEN v_old := to_jsonb(OLD); END IF;
  IF TG_OP <> 'DELETE' THEN v_new := to_jsonb(NEW); END IF;
  -- Las credenciales nunca se copian a la bitácora funcional.
  IF TG_TABLE_NAME = 'usuarios' THEN
    v_old := v_old - 'password_hash';
    v_new := v_new - 'password_hash';
  END IF;
  v_id := COALESCE((v_new->>'id')::UUID, (v_old->>'id')::UUID);
  INSERT INTO bitacora(usuario_id, accion, entidad, entidad_id, detalles)
  VALUES (
    usuario_contexto(), lower(TG_OP), TG_TABLE_NAME, v_id,
    jsonb_build_object('anterior', v_old, 'nuevo', v_new)
  );
  RETURN COALESCE(NEW, OLD);
END $$;

CREATE OR REPLACE FUNCTION actualizar_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END $$;

CREATE OR REPLACE FUNCTION impedir_borrado_fisico()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF current_setting('app.allow_hard_delete', true) IS DISTINCT FROM 'on' THEN
    RAISE EXCEPTION 'Borrado físico deshabilitado para %. Use deleted_at', TG_TABLE_NAME;
  END IF;
  RETURN OLD;
END $$;

CREATE OR REPLACE FUNCTION bitacora_inmutable()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'La bitácora es inmutable'; END $$;
CREATE TRIGGER trg_bitacora_inmutable BEFORE UPDATE OR DELETE ON bitacora
FOR EACH ROW EXECUTE FUNCTION bitacora_inmutable();
REVOKE UPDATE, DELETE ON bitacora FROM PUBLIC;

-- Triggers uniformes para entidades con updated_at.
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'roles','paises','unidades_negocio','usuarios','categorias_riesgo','riesgos',
    'controles','planes_mitigacion','acciones_mitigacion','auditorias','hallazgos',
    'normativas','requisitos','evaluaciones_cumplimiento'
  ] LOOP
    EXECUTE format(
      'CREATE TRIGGER trg_%I_updated BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION actualizar_updated_at()',
      t, t
    );
  END LOOP;
END $$;

-- Auditoría automática de las entidades funcionales con UUID.
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'usuarios','riesgos','controles','planes_mitigacion','acciones_mitigacion',
    'auditorias','hallazgos','normativas','requisitos','evaluaciones_cumplimiento',
    'alertas','evidencias'
  ] LOOP
    EXECUTE format(
      'CREATE TRIGGER trg_%I_audit AFTER INSERT OR UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION registrar_bitacora()',
      t, t
    );
  END LOOP;
END $$;

-- Entidades trazables: solo borrado lógico durante operación normal.
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'usuarios','riesgos','controles','planes_mitigacion','acciones_mitigacion',
    'auditorias','hallazgos','normativas','requisitos','evaluaciones_cumplimiento',
    'alertas','evidencias'
  ] LOOP
    EXECUTE format(
      'CREATE TRIGGER trg_%I_no_delete BEFORE DELETE ON %I FOR EACH ROW EXECUTE FUNCTION impedir_borrado_fisico()',
      t, t
    );
  END LOOP;
END $$;

-- SEMILLAS IDEMPOTENTES -------------------------------------------------------
INSERT INTO modulos(codigo, nombre) VALUES
  ('usuarios','Usuarios y roles'), ('organizacion','Organización y catálogos'),
  ('riesgos','Riesgos'), ('mitigacion','Controles y mitigación'),
  ('auditorias','Auditorías'), ('cumplimiento','Cumplimiento'),
  ('alertas','Alertas'), ('reportes','Dashboard y reportes'), ('bitacora','Bitácora')
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO roles(nombre, descripcion) VALUES
  ('administrador','Configuración y administración global'),
  ('analista_riesgos','Registro, evaluación y monitoreo de riesgos'),
  ('propietario_riesgo','Ejecución de acciones asignadas'),
  ('auditor_interno','Auditorías, evidencia y hallazgos'),
  ('responsable_cumplimiento','Normativas y evaluaciones'),
  ('gerencia','Consulta ejecutiva y decisiones'),
  ('equipo_tecnico','Infraestructura y soporte')
ON CONFLICT (nombre) DO NOTHING;

-- Administrador: control global de todos los módulos.
INSERT INTO permisos_rol(
  rol_id, modulo_id, puede_crear, puede_leer, puede_actualizar,
  puede_desactivar, alcance
)
SELECT r.id, m.id, true, true, true, true, 'global'
FROM roles r CROSS JOIN modulos m
WHERE r.nombre = 'administrador'
ON CONFLICT (rol_id, modulo_id) DO UPDATE SET
  puede_crear = EXCLUDED.puede_crear,
  puede_leer = EXCLUDED.puede_leer,
  puede_actualizar = EXCLUDED.puede_actualizar,
  puede_desactivar = EXCLUDED.puede_desactivar,
  alcance = EXCLUDED.alcance;

-- Matriz mínima de los roles funcionales. Las excepciones se resuelven por
-- asignación, unidad y propietario en la capa de autorización/RLS.
WITH matriz(rol, modulo, crear, leer, actualizar, desactivar, alcance) AS (
  VALUES
    ('analista_riesgos','riesgos',true,true,true,false,'unidad'::alcance_permiso),
    ('analista_riesgos','mitigacion',true,true,true,false,'unidad'::alcance_permiso),
    ('analista_riesgos','alertas',false,true,true,false,'unidad'::alcance_permiso),
    ('analista_riesgos','reportes',false,true,false,false,'unidad'::alcance_permiso),
    ('propietario_riesgo','riesgos',false,true,true,false,'asignado'::alcance_permiso),
    ('propietario_riesgo','mitigacion',false,true,true,false,'asignado'::alcance_permiso),
    ('propietario_riesgo','alertas',false,true,true,false,'propio'::alcance_permiso),
    ('auditor_interno','auditorias',true,true,true,false,'asignado'::alcance_permiso),
    ('auditor_interno','riesgos',false,true,false,false,'unidad'::alcance_permiso),
    ('auditor_interno','bitacora',false,true,false,false,'unidad'::alcance_permiso),
    ('responsable_cumplimiento','cumplimiento',true,true,true,false,'unidad'::alcance_permiso),
    ('responsable_cumplimiento','alertas',false,true,true,false,'unidad'::alcance_permiso),
    ('responsable_cumplimiento','reportes',false,true,false,false,'unidad'::alcance_permiso),
    ('gerencia','riesgos',false,true,false,false,'global'::alcance_permiso),
    ('gerencia','auditorias',false,true,false,false,'global'::alcance_permiso),
    ('gerencia','cumplimiento',false,true,false,false,'global'::alcance_permiso),
    ('gerencia','alertas',false,true,false,false,'global'::alcance_permiso),
    ('gerencia','reportes',false,true,false,false,'global'::alcance_permiso)
)
INSERT INTO permisos_rol(
  rol_id, modulo_id, puede_crear, puede_leer, puede_actualizar,
  puede_desactivar, alcance
)
SELECT r.id, m.id, x.crear, x.leer, x.actualizar, x.desactivar, x.alcance
FROM matriz x
JOIN roles r ON r.nombre = x.rol
JOIN modulos m ON m.codigo = x.modulo
ON CONFLICT (rol_id, modulo_id) DO UPDATE SET
  puede_crear = EXCLUDED.puede_crear,
  puede_leer = EXCLUDED.puede_leer,
  puede_actualizar = EXCLUDED.puede_actualizar,
  puede_desactivar = EXCLUDED.puede_desactivar,
  alcance = EXCLUDED.alcance;

INSERT INTO categorias_riesgo(nombre, apetito_base) VALUES
  ('Tecnológico',10), ('Financiero',10), ('Legal',8),
  ('Operativo',10), ('Reputacional',6)
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO reglas_alerta(codigo, nombre, severidad) VALUES
  ('AL-01','Residual superior al apetito','alta'),
  ('AL-02','Plan o acción vencida','alta'),
  ('AL-03','Hallazgo crítico sin respuesta','critica'),
  ('AL-04','Requisito no conforme','alta'),
  ('AL-05','Normativa o requisito próximo a vencer','media'),
  ('AL-06','Riesgo crítico sin propietario o plan','critica'),
  ('AL-07','Control clave con efectividad reducida','alta')
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO transiciones_riesgo(origen, destino) VALUES
  ('identificado','en_evaluacion'), ('identificado','cancelado'),
  ('en_evaluacion','abierto'), ('en_evaluacion','aceptado'), ('en_evaluacion','cancelado'),
  ('abierto','en_tratamiento'), ('abierto','aceptado'), ('abierto','cerrado'),
  ('en_tratamiento','monitoreo'), ('en_tratamiento','abierto'),
  ('monitoreo','cerrado'), ('monitoreo','en_tratamiento'),
  ('aceptado','abierto'), ('cerrado','abierto')
ON CONFLICT DO NOTHING;

INSERT INTO parametros_sistema(clave, valor, descripcion) VALUES
  ('evidencia_max_bytes','10485760'::jsonb,'Tamaño máximo de archivo: 10 MiB'),
  ('alerta_dias_vencimiento','30'::jsonb,'Días de anticipación para AL-05'),
  ('sesion_minutos','30'::jsonb,'Duración de sesión de acceso')
ON CONFLICT (clave) DO NOTHING;

-- El motor AL-01..AL-07 se ejecuta desde un servicio transaccional/cron.
-- La restricción uq_alerta_pendiente garantiza idempotencia en la persistencia.
