-- ============================================================================
-- SGR-EG - Escenario integral de demostración
-- Requiere haber ejecutado schema_SGR-EG.sql.
-- Es idempotente por UUID/correo y no modifica registros existentes.
--
-- Usuarios demo: *@demo.sgr-eg.local (excepto el administrador)
-- Contraseña común: DemoSGR2026!
-- ============================================================================

BEGIN;

-- No atribuir a un usuario aún inexistente las primeras inserciones.
SELECT set_config('app.user_id', '', true);

-- ORGANIZACIÓN ---------------------------------------------------------------
INSERT INTO paises (id, nombre, codigo_iso, estado) VALUES
  ('10000000-0000-4000-8000-000000000001', 'Bolivia Demo', 'BO', 'activo'),
  ('10000000-0000-4000-8000-000000000002', 'Perú Demo',    'PE', 'activo'),
  ('10000000-0000-4000-8000-000000000003', 'Chile Demo',   'CL', 'activo')
ON CONFLICT DO NOTHING;

INSERT INTO unidades_negocio (id, nombre, pais_id, moneda, estado) VALUES
  ('11000000-0000-4000-8000-000000000001', 'Corporativo La Paz',
   '10000000-0000-4000-8000-000000000001', 'BOB', 'activo'),
  ('11000000-0000-4000-8000-000000000002', 'Operaciones Santa Cruz',
   '10000000-0000-4000-8000-000000000001', 'BOB', 'activo'),
  ('11000000-0000-4000-8000-000000000003', 'Operaciones Lima',
   '10000000-0000-4000-8000-000000000002', 'PEN', 'activo'),
  ('11000000-0000-4000-8000-000000000004', 'Operaciones Santiago',
   '10000000-0000-4000-8000-000000000003', 'CLP', 'activo')
ON CONFLICT DO NOTHING;

-- USUARIOS Y ALCANCE ---------------------------------------------------------
-- Hash scrypt compatible con PasswordHasher para: DemoSGR2026!
INSERT INTO usuarios (
  id, nombre, correo, password_hash, estado, debe_cambiar_password
) VALUES
  ('20000000-0000-4000-8000-000000000001', 'Ana Torres',
   'ana.analista@demo.sgr-eg.local',
   'scrypt$16384$8$1$ABEiM0RVZneImaq7zN3u_w$QZdbDLrSMb1K7xZ7qweISdFNFmLurg_0fKn74jbG5LErfF-eJY89P5VzxHlIRNvMHa1uMvVkcyOgFCFLC6iS9g',
   'activo', false),
  ('20000000-0000-4000-8000-000000000002', 'Carlos Mendoza',
   'carlos.propietario@demo.sgr-eg.local',
   'scrypt$16384$8$1$ABEiM0RVZneImaq7zN3u_w$QZdbDLrSMb1K7xZ7qweISdFNFmLurg_0fKn74jbG5LErfF-eJY89P5VzxHlIRNvMHa1uMvVkcyOgFCFLC6iS9g',
   'activo', false),
  ('20000000-0000-4000-8000-000000000003', 'María López',
   'maria.auditora@demo.sgr-eg.local',
   'scrypt$16384$8$1$ABEiM0RVZneImaq7zN3u_w$QZdbDLrSMb1K7xZ7qweISdFNFmLurg_0fKn74jbG5LErfF-eJY89P5VzxHlIRNvMHa1uMvVkcyOgFCFLC6iS9g',
   'activo', false),
  ('20000000-0000-4000-8000-000000000004', 'Lucía Fernández',
   'lucia.cumplimiento@demo.sgr-eg.local',
   'scrypt$16384$8$1$ABEiM0RVZneImaq7zN3u_w$QZdbDLrSMb1K7xZ7qweISdFNFmLurg_0fKn74jbG5LErfF-eJY89P5VzxHlIRNvMHa1uMvVkcyOgFCFLC6iS9g',
   'activo', false),
  ('20000000-0000-4000-8000-000000000005', 'Jorge Salazar',
   'jorge.gerencia@demo.sgr-eg.local',
   'scrypt$16384$8$1$ABEiM0RVZneImaq7zN3u_w$QZdbDLrSMb1K7xZ7qweISdFNFmLurg_0fKn74jbG5LErfF-eJY89P5VzxHlIRNvMHa1uMvVkcyOgFCFLC6iS9g',
   'activo', false),
  ('20000000-0000-4000-8000-000000000006', 'Diego Rojas',
   'diego.tecnico@demo.sgr-eg.local',
   'scrypt$16384$8$1$ABEiM0RVZneImaq7zN3u_w$QZdbDLrSMb1K7xZ7qweISdFNFmLurg_0fKn74jbG5LErfF-eJY89P5VzxHlIRNvMHa1uMvVkcyOgFCFLC6iS9g',
   'activo', false),
  ('20000000-0000-4000-8000-000000000007', 'Administradora Demo',
   'admin.sgr@gmail.com',
   'scrypt$16384$8$1$ABEiM0RVZneImaq7zN3u_w$QZdbDLrSMb1K7xZ7qweISdFNFmLurg_0fKn74jbG5LErfF-eJY89P5VzxHlIRNvMHa1uMvVkcyOgFCFLC6iS9g',
   'activo', false)
ON CONFLICT DO NOTHING;

WITH asignaciones(usuario_id, rol_nombre) AS (
  VALUES
    ('20000000-0000-4000-8000-000000000001'::uuid, 'analista_riesgos'),
    ('20000000-0000-4000-8000-000000000002'::uuid, 'propietario_riesgo'),
    ('20000000-0000-4000-8000-000000000003'::uuid, 'auditor_interno'),
    ('20000000-0000-4000-8000-000000000004'::uuid, 'responsable_cumplimiento'),
    ('20000000-0000-4000-8000-000000000005'::uuid, 'gerencia'),
    ('20000000-0000-4000-8000-000000000006'::uuid, 'equipo_tecnico'),
    ('20000000-0000-4000-8000-000000000007'::uuid, 'administrador')
)
INSERT INTO usuario_roles (usuario_id, rol_id)
SELECT a.usuario_id, r.id
FROM asignaciones a
JOIN roles r ON r.nombre = a.rol_nombre
ON CONFLICT DO NOTHING;

INSERT INTO usuario_unidades (usuario_id, unidad_id, es_principal) VALUES
  ('20000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000001', true),
  ('20000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000002', false),
  ('20000000-0000-4000-8000-000000000002', '11000000-0000-4000-8000-000000000001', true),
  ('20000000-0000-4000-8000-000000000003', '11000000-0000-4000-8000-000000000001', true),
  ('20000000-0000-4000-8000-000000000003', '11000000-0000-4000-8000-000000000002', false),
  ('20000000-0000-4000-8000-000000000004', '11000000-0000-4000-8000-000000000003', true),
  ('20000000-0000-4000-8000-000000000005', '11000000-0000-4000-8000-000000000001', true),
  ('20000000-0000-4000-8000-000000000006', '11000000-0000-4000-8000-000000000004', true),
  ('20000000-0000-4000-8000-000000000007', '11000000-0000-4000-8000-000000000001', true)
ON CONFLICT DO NOTHING;

SELECT set_config(
  'app.user_id',
  '20000000-0000-4000-8000-000000000001',
  true
);

-- CONFIGURACIÓN DE APETITO ---------------------------------------------------
INSERT INTO apetitos_riesgo (
  id, categoria_id, unidad_id, umbral, vigente_desde, vigente_hasta, creado_por
) VALUES
  ('30000000-0000-4000-8000-000000000001',
   (SELECT id FROM categorias_riesgo WHERE nombre = 'Tecnológico'),
   NULL, 10, DATE '2026-01-01', NULL,
   '20000000-0000-4000-8000-000000000001'),
  ('30000000-0000-4000-8000-000000000002',
   (SELECT id FROM categorias_riesgo WHERE nombre = 'Tecnológico'),
   '11000000-0000-4000-8000-000000000001', 8, DATE '2026-01-01', NULL,
   '20000000-0000-4000-8000-000000000001'),
  ('30000000-0000-4000-8000-000000000003',
   (SELECT id FROM categorias_riesgo WHERE nombre = 'Financiero'),
   NULL, 9, DATE '2026-01-01', NULL,
   '20000000-0000-4000-8000-000000000001'),
  ('30000000-0000-4000-8000-000000000004',
   (SELECT id FROM categorias_riesgo WHERE nombre = 'Legal'),
   '11000000-0000-4000-8000-000000000003', 6, DATE '2026-01-01', DATE '2026-12-31',
   '20000000-0000-4000-8000-000000000001')
ON CONFLICT DO NOTHING;

INSERT INTO parametros_sistema (clave, valor, descripcion, actualizado_por)
VALUES (
  'criticidad_rangos',
  '{"bajo":[1,4],"moderado":[5,9],"alto":[10,16],"critico":[17,25]}'::jsonb,
  'Rangos de criticidad usados por el escenario de demostración',
  '20000000-0000-4000-8000-000000000001'
)
ON CONFLICT (clave) DO NOTHING;

-- RIESGOS EN TODOS LOS ESTADOS -----------------------------------------------
INSERT INTO riesgos (
  id, codigo, titulo, descripcion, causas, consecuencias, objetivos_afectados,
  categoria_id, unidad_id, propietario_id, creado_por, probabilidad, impacto,
  exposicion_financiera, moneda, estado, justificacion_aceptacion,
  aceptado_por, aceptado_at, fecha_revision, created_at
) VALUES
  ('40000000-0000-4000-8000-000000000001', 'R-2026-99001',
   'Dependencia de proveedor crítico',
   'Servicio central dependiente de un único proveedor tecnológico.',
   'Ausencia de proveedor alternativo y contrato sin salida inmediata.',
   'Interrupción de operaciones y pérdida de disponibilidad.',
   'Continuidad operativa y experiencia del cliente.',
   (SELECT id FROM categorias_riesgo WHERE nombre = 'Tecnológico'),
   '11000000-0000-4000-8000-000000000001', NULL,
   '20000000-0000-4000-8000-000000000001', 4, 5,
   250000, 'BOB', 'identificado', NULL, NULL, NULL, NULL,
   TIMESTAMPTZ '2026-07-01 09:00:00-04'),
  ('40000000-0000-4000-8000-000000000002', 'R-2026-99002',
   'Fraude en pagos digitales',
   'Operaciones fraudulentas mediante suplantación de identidad.',
   'Controles de autenticación insuficientes en canales heredados.',
   'Pérdida financiera, reclamos y sanciones.',
   'Rentabilidad y confianza del cliente.',
   (SELECT id FROM categorias_riesgo WHERE nombre = 'Financiero'),
   '11000000-0000-4000-8000-000000000001',
   '20000000-0000-4000-8000-000000000002',
   '20000000-0000-4000-8000-000000000001', 5, 5,
   800000, 'BOB', 'en_evaluacion', NULL, NULL, NULL, NULL,
   TIMESTAMPTZ '2026-06-10 10:00:00-04'),
  ('40000000-0000-4000-8000-000000000003', 'R-2026-99003',
   'Incumplimiento de protección de datos',
   'Tratamiento de datos personales sin evidencia completa de consentimiento.',
   'Inventario de tratamientos desactualizado.',
   'Multas, litigios y suspensión de actividades.',
   'Cumplimiento regulatorio y reputación.',
   (SELECT id FROM categorias_riesgo WHERE nombre = 'Legal'),
   '11000000-0000-4000-8000-000000000003',
   '20000000-0000-4000-8000-000000000004',
   '20000000-0000-4000-8000-000000000001', 4, 4,
   500000, 'PEN', 'abierto', NULL, NULL, NULL, NULL,
   TIMESTAMPTZ '2026-05-05 08:30:00-04'),
  ('40000000-0000-4000-8000-000000000004', 'R-2026-99004',
   'Caída del centro de datos',
   'Indisponibilidad prolongada del centro de datos principal.',
   'Pruebas de recuperación incompletas y capacidad limitada.',
   'Paralización de servicios internos y externos.',
   'Disponibilidad, continuidad y nivel de servicio.',
   (SELECT id FROM categorias_riesgo WHERE nombre = 'Operativo'),
   '11000000-0000-4000-8000-000000000002',
   '20000000-0000-4000-8000-000000000002',
   '20000000-0000-4000-8000-000000000001', 4, 5,
   1000000, 'BOB', 'en_tratamiento', NULL, NULL, NULL, NULL,
   TIMESTAMPTZ '2026-04-01 11:00:00-04'),
  ('40000000-0000-4000-8000-000000000005', 'R-2026-99005',
   'Deterioro de reputación en redes',
   'Campaña negativa con alta propagación en canales sociales.',
   'Respuesta tardía y monitoreo fragmentado.',
   'Pérdida de clientes y menor confianza de mercado.',
   'Reputación corporativa y crecimiento.',
   (SELECT id FROM categorias_riesgo WHERE nombre = 'Reputacional'),
   '11000000-0000-4000-8000-000000000001',
   '20000000-0000-4000-8000-000000000002',
   '20000000-0000-4000-8000-000000000001', 3, 4,
   150000, 'BOB', 'monitoreo', NULL, NULL, NULL, NULL,
   TIMESTAMPTZ '2026-03-12 14:00:00-04'),
  ('40000000-0000-4000-8000-000000000006', 'R-2026-99006',
   'Variación de tipo de cambio',
   'Exposición temporal a fluctuaciones de moneda extranjera.',
   'Cobertura parcial de obligaciones en moneda extranjera.',
   'Desviación presupuestaria controlada.',
   'Estabilidad financiera.',
   (SELECT id FROM categorias_riesgo WHERE nombre = 'Financiero'),
   '11000000-0000-4000-8000-000000000003',
   '20000000-0000-4000-8000-000000000004',
   '20000000-0000-4000-8000-000000000001', 2, 3,
   100000, 'PEN', 'aceptado',
   'La exposición está dentro del apetito aprobado y cuenta con revisión trimestral.',
   '20000000-0000-4000-8000-000000000005',
   TIMESTAMPTZ '2026-07-15 10:00:00-04', DATE '2026-10-15',
   TIMESTAMPTZ '2026-02-01 10:00:00-04'),
  ('40000000-0000-4000-8000-000000000007', 'R-2026-99007',
   'Obsolescencia de plataforma legada',
   'Plataforma sustituida después de completar la migración.',
   'Tecnología sin soporte del fabricante.',
   'Vulnerabilidades y fallos de operación.',
   'Modernización tecnológica.',
   (SELECT id FROM categorias_riesgo WHERE nombre = 'Tecnológico'),
   '11000000-0000-4000-8000-000000000004',
   '20000000-0000-4000-8000-000000000006',
   '20000000-0000-4000-8000-000000000001', 3, 5,
   400000, 'CLP', 'cerrado', NULL, NULL, NULL, NULL,
   TIMESTAMPTZ '2025-09-01 09:00:00-04'),
  ('40000000-0000-4000-8000-000000000008', 'R-2026-99008',
   'Expansión comercial suspendida',
   'Riesgo cancelado al suspenderse la iniciativa que lo originó.',
   'Cambio de estrategia corporativa.',
   'Ninguna mientras el proyecto permanezca suspendido.',
   'Expansión regional.',
   (SELECT id FROM categorias_riesgo WHERE nombre = 'Operativo'),
   '11000000-0000-4000-8000-000000000002',
   '20000000-0000-4000-8000-000000000002',
   '20000000-0000-4000-8000-000000000001', 2, 2,
   NULL, NULL, 'cancelado', NULL, NULL, NULL, NULL,
   TIMESTAMPTZ '2026-01-15 09:00:00-04')
ON CONFLICT DO NOTHING;

-- CONTROLES, PLANES Y ACCIONES ------------------------------------------------
INSERT INTO controles (
  id, riesgo_id, descripcion, tipo, efectividad, es_clave, estado, created_at
) VALUES
  ('50000000-0000-4000-8000-000000000001',
   '40000000-0000-4000-8000-000000000002',
   'Autenticación reforzada y análisis antifraude en tiempo real.',
   'preventivo', 65, true, 'activo', TIMESTAMPTZ '2026-06-12 10:00:00-04'),
  ('50000000-0000-4000-8000-000000000002',
   '40000000-0000-4000-8000-000000000002',
   'Conciliación diaria de transacciones y alertas de anomalías.',
   'detectivo', 40, false, 'activo', TIMESTAMPTZ '2026-06-15 10:00:00-04'),
  ('50000000-0000-4000-8000-000000000003',
   '40000000-0000-4000-8000-000000000004',
   'Sitio alterno y respaldo replicado.',
   'correctivo', 70, true, 'activo', TIMESTAMPTZ '2026-04-05 10:00:00-04'),
  ('50000000-0000-4000-8000-000000000004',
   '40000000-0000-4000-8000-000000000005',
   'Monitoreo automatizado de menciones y protocolo de crisis.',
   'detectivo', 55, true, 'activo', TIMESTAMPTZ '2026-03-15 10:00:00-04'),
  ('50000000-0000-4000-8000-000000000005',
   '40000000-0000-4000-8000-000000000003',
   'Revisión manual de consentimientos históricos.',
   'detectivo', 25, false, 'inactivo', TIMESTAMPTZ '2026-05-08 10:00:00-04')
ON CONFLICT DO NOTHING;

INSERT INTO planes_mitigacion (
  id, riesgo_id, responsable_id, descripcion, fecha_limite, avance, estado,
  created_at
) VALUES
  ('60000000-0000-4000-8000-000000000001',
   '40000000-0000-4000-8000-000000000002',
   '20000000-0000-4000-8000-000000000002',
   'Fortalecer prevención y respuesta ante fraude digital.',
   DATE '2026-10-30', 45, 'activo', TIMESTAMPTZ '2026-06-20 09:00:00-04'),
  ('60000000-0000-4000-8000-000000000002',
   '40000000-0000-4000-8000-000000000004',
   '20000000-0000-4000-8000-000000000002',
   'Completar capacidad de recuperación del centro alterno.',
   DATE '2026-06-30', 60, 'vencido', TIMESTAMPTZ '2026-02-01 09:00:00-04'),
  ('60000000-0000-4000-8000-000000000003',
   '40000000-0000-4000-8000-000000000005',
   '20000000-0000-4000-8000-000000000001',
   'Implantar protocolo integral de gestión de crisis.',
   DATE '2026-08-31', 100, 'completado', TIMESTAMPTZ '2026-03-20 09:00:00-04')
ON CONFLICT DO NOTHING;

INSERT INTO acciones_mitigacion (
  id, plan_id, descripcion, responsable_id, fecha_limite, avance, estado,
  created_at
) VALUES
  ('61000000-0000-4000-8000-000000000001',
   '60000000-0000-4000-8000-000000000001',
   'Activar autenticación adaptativa para operaciones de alto riesgo.',
   '20000000-0000-4000-8000-000000000006',
   DATE '2026-09-15', 70, 'activo', TIMESTAMPTZ '2026-06-21 09:00:00-04'),
  ('61000000-0000-4000-8000-000000000002',
   '60000000-0000-4000-8000-000000000001',
   'Capacitar al equipo de monitoreo antifraude.',
   '20000000-0000-4000-8000-000000000002',
   DATE '2026-10-01', 20, 'activo', TIMESTAMPTZ '2026-06-21 09:00:00-04'),
  ('61000000-0000-4000-8000-000000000003',
   '60000000-0000-4000-8000-000000000002',
   'Ejecutar simulacro de recuperación integral.',
   '20000000-0000-4000-8000-000000000006',
   DATE '2026-05-31', 60, 'vencido', TIMESTAMPTZ '2026-02-05 09:00:00-04'),
  ('61000000-0000-4000-8000-000000000004',
   '60000000-0000-4000-8000-000000000003',
   'Aprobar matriz de voceros y mensajes de contingencia.',
   '20000000-0000-4000-8000-000000000001',
   DATE '2026-07-15', 100, 'completado', TIMESTAMPTZ '2026-03-21 09:00:00-04')
ON CONFLICT DO NOTHING;

-- AUDITORÍAS Y HALLAZGOS -----------------------------------------------------
INSERT INTO auditorias (
  id, objetivo, alcance, fecha_inicio, fecha_fin, responsable_id, unidad_id,
  estado, created_at
) VALUES
  ('70000000-0000-4000-8000-000000000001',
   'Evaluar controles de continuidad tecnológica',
   'Infraestructura, respaldos, recuperación y proveedores críticos.',
   DATE '2026-08-01', DATE '2026-08-20',
   '20000000-0000-4000-8000-000000000003',
   '11000000-0000-4000-8000-000000000001',
   'planificada', TIMESTAMPTZ '2026-07-01 09:00:00-04'),
  ('70000000-0000-4000-8000-000000000002',
   'Revisar gestión antifraude',
   'Canales digitales, monitoreo y gestión de incidentes.',
   DATE '2026-05-01', DATE '2026-05-25',
   '20000000-0000-4000-8000-000000000003',
   '11000000-0000-4000-8000-000000000001',
   'en_ejecucion', TIMESTAMPTZ '2026-04-15 09:00:00-04'),
  ('70000000-0000-4000-8000-000000000003',
   'Auditoría de privacidad 2025',
   'Procesos de tratamiento y conservación de datos personales.',
   DATE '2025-10-01', DATE '2025-10-31',
   '20000000-0000-4000-8000-000000000003',
   '11000000-0000-4000-8000-000000000003',
   'cerrada', TIMESTAMPTZ '2025-09-10 09:00:00-04')
ON CONFLICT DO NOTHING;

INSERT INTO auditoria_equipo (auditoria_id, usuario_id, funcion) VALUES
  ('70000000-0000-4000-8000-000000000001',
   '20000000-0000-4000-8000-000000000003', 'Auditor líder'),
  ('70000000-0000-4000-8000-000000000001',
   '20000000-0000-4000-8000-000000000006', 'Especialista técnico'),
  ('70000000-0000-4000-8000-000000000002',
   '20000000-0000-4000-8000-000000000003', 'Auditor líder'),
  ('70000000-0000-4000-8000-000000000002',
   '20000000-0000-4000-8000-000000000001', 'Analista de riesgos')
ON CONFLICT DO NOTHING;

INSERT INTO hallazgos (
  id, auditoria_id, riesgo_id, severidad, condicion, recomendacion, respuesta,
  responsable_id, fecha_limite, fecha_respuesta, estado,
  requiere_evidencia_cierre, cerrado_por, cerrado_at, created_at
) VALUES
  ('71000000-0000-4000-8000-000000000001',
   '70000000-0000-4000-8000-000000000002',
   '40000000-0000-4000-8000-000000000002',
   'critica',
   'La regla de detección no cubre operaciones realizadas desde dispositivos nuevos.',
   'Implementar análisis de dispositivo y autenticación adaptativa.',
   NULL, '20000000-0000-4000-8000-000000000002',
   DATE '2026-08-15', NULL, 'abierto', true, NULL, NULL,
   TIMESTAMPTZ '2026-05-10 09:00:00-04'),
  ('71000000-0000-4000-8000-000000000002',
   '70000000-0000-4000-8000-000000000003',
   '40000000-0000-4000-8000-000000000003',
   'media',
   'El inventario de tratamientos no incluía dos procesos secundarios.',
   'Actualizar el inventario y asignar responsables de revisión.',
   'Inventario actualizado y aprobado por cumplimiento.',
   '20000000-0000-4000-8000-000000000004',
   DATE '2025-12-15', TIMESTAMPTZ '2025-12-10 15:00:00-04',
   'cerrado', true,
   '20000000-0000-4000-8000-000000000003',
   TIMESTAMPTZ '2025-12-12 10:00:00-04',
   TIMESTAMPTZ '2025-10-20 09:00:00-04'),
  ('71000000-0000-4000-8000-000000000003',
   '70000000-0000-4000-8000-000000000002',
   NULL, 'alta',
   'No existe revisión independiente de alertas descartadas.',
   'Establecer revisión semanal por un segundo analista.',
   'Procedimiento en elaboración.',
   '20000000-0000-4000-8000-000000000001',
   DATE '2026-09-01', TIMESTAMPTZ '2026-07-20 11:00:00-04',
   'en_seguimiento', true, NULL, NULL,
   TIMESTAMPTZ '2026-05-12 09:00:00-04')
ON CONFLICT DO NOTHING;

-- CUMPLIMIENTO Y VERSIONADO --------------------------------------------------
INSERT INTO normativas (
  id, nombre, jurisdiccion, pais_id, version, vigencia_inicio, vigencia_fin,
  estado, created_at
) VALUES
  ('80000000-0000-4000-8000-000000000001',
   'Ley de Protección de Datos Demo', 'Bolivia',
   '10000000-0000-4000-8000-000000000001', '1.0',
   DATE '2025-01-01', NULL, 'vigente', TIMESTAMPTZ '2025-01-01 09:00:00-04'),
  ('80000000-0000-4000-8000-000000000002',
   'Reglamento de Continuidad Operativa Demo', 'Regional',
   NULL, '2026', DATE '2026-01-01', NULL, 'vigente',
   TIMESTAMPTZ '2026-01-01 09:00:00-04'),
  ('80000000-0000-4000-8000-000000000003',
   'Circular de Seguridad Digital Demo', 'Perú',
   '10000000-0000-4000-8000-000000000002', '2.1',
   DATE '2024-01-01', DATE '2025-12-31', 'derogada',
   TIMESTAMPTZ '2024-01-01 09:00:00-04')
ON CONFLICT DO NOTHING;

INSERT INTO requisitos (
  id, normativa_id, codigo, descripcion, criticidad, version,
  requisito_raiz_id, vigencia_inicio, vigencia_fin, vigente, created_at
) VALUES
  ('81000000-0000-4000-8000-000000000001',
   '80000000-0000-4000-8000-000000000001', 'PD-01',
   'Mantener inventario actualizado de tratamientos de datos.',
   'alta', 1, NULL, DATE '2025-01-01', DATE '2025-12-31', false,
   TIMESTAMPTZ '2025-01-01 09:00:00-04'),
  ('81000000-0000-4000-8000-000000000002',
   '80000000-0000-4000-8000-000000000001', 'PD-01',
   'Mantener inventario actualizado, responsable y revisión semestral.',
   'alta', 2, '81000000-0000-4000-8000-000000000001',
   DATE '2026-01-01', NULL, true, TIMESTAMPTZ '2026-01-01 09:00:00-04'),
  ('81000000-0000-4000-8000-000000000003',
   '80000000-0000-4000-8000-000000000001', 'PD-02',
   'Conservar evidencia del consentimiento del titular.',
   'alta', 1, NULL, DATE '2025-01-01', NULL, true,
   TIMESTAMPTZ '2025-01-01 09:00:00-04'),
  ('81000000-0000-4000-8000-000000000004',
   '80000000-0000-4000-8000-000000000002', 'CO-01',
   'Probar el plan de continuidad al menos una vez al año.',
   'media', 1, NULL, DATE '2026-01-01', NULL, true,
   TIMESTAMPTZ '2026-01-01 09:00:00-04')
ON CONFLICT DO NOTHING;

INSERT INTO evaluaciones_cumplimiento (
  id, requisito_id, unidad_id, periodo_inicio, periodo_fin, resultado,
  evaluador_id, observaciones, justificacion_no_aplicable, plan_accion,
  responsable_plan_id, fecha_limite_plan, created_at
) VALUES
  ('82000000-0000-4000-8000-000000000001',
   '81000000-0000-4000-8000-000000000002',
   '11000000-0000-4000-8000-000000000001',
   DATE '2026-01-01', DATE '2026-06-30', 'conforme',
   '20000000-0000-4000-8000-000000000004',
   'Inventario aprobado y revisión semestral documentada.',
   NULL, NULL, NULL, NULL, TIMESTAMPTZ '2026-07-05 09:00:00-04'),
  ('82000000-0000-4000-8000-000000000002',
   '81000000-0000-4000-8000-000000000003',
   '11000000-0000-4000-8000-000000000003',
   DATE '2026-01-01', DATE '2026-06-30', 'parcialmente_conforme',
   '20000000-0000-4000-8000-000000000004',
   'Existen consentimientos, pero falta completar la migración histórica.',
   NULL, NULL, NULL, NULL, TIMESTAMPTZ '2026-07-06 09:00:00-04'),
  ('82000000-0000-4000-8000-000000000003',
   '81000000-0000-4000-8000-000000000004',
   '11000000-0000-4000-8000-000000000002',
   DATE '2026-01-01', DATE '2026-06-30', 'no_conforme',
   '20000000-0000-4000-8000-000000000004',
   'No se ejecutó el simulacro en el periodo.',
   NULL,
   'Ejecutar simulacro integral, documentar resultados y cerrar brechas.',
   '20000000-0000-4000-8000-000000000002',
   DATE '2026-09-30', TIMESTAMPTZ '2026-07-07 09:00:00-04'),
  ('82000000-0000-4000-8000-000000000004',
   '81000000-0000-4000-8000-000000000003',
   '11000000-0000-4000-8000-000000000004',
   DATE '2026-01-01', DATE '2026-06-30', 'no_aplicable',
   '20000000-0000-4000-8000-000000000004',
   'La unidad no trata datos personales de clientes.',
   'La operación de Santiago procesa únicamente datos corporativos internos.',
   NULL, NULL, NULL, TIMESTAMPTZ '2026-07-08 09:00:00-04')
ON CONFLICT DO NOTHING;

-- ALERTAS E HISTORIAL ---------------------------------------------------------
INSERT INTO alertas (
  id, regla_codigo, severidad, riesgo_id, control_id, plan_id, accion_id,
  hallazgo_id, normativa_id, requisito_id, evaluacion_id, destinatario_id,
  mensaje, estado, generada_at, atendida_at
) VALUES
  ('90000000-0000-4000-8000-000000000001',
   'AL-01', 'alta', '40000000-0000-4000-8000-000000000003',
   NULL, NULL, NULL, NULL, NULL, NULL, NULL,
   '20000000-0000-4000-8000-000000000004',
   'El riesgo residual de privacidad supera el apetito vigente.',
   'pendiente', TIMESTAMPTZ '2026-07-20 08:00:00-04', NULL),
  ('90000000-0000-4000-8000-000000000002',
   'AL-02', 'alta', NULL, NULL, '60000000-0000-4000-8000-000000000002',
   NULL, NULL, NULL, NULL, NULL,
   '20000000-0000-4000-8000-000000000002',
   'El plan de recuperación del centro alterno está vencido.',
   'pendiente', TIMESTAMPTZ '2026-07-01 08:00:00-04', NULL),
  ('90000000-0000-4000-8000-000000000003',
   'AL-03', 'critica', NULL, NULL, NULL, NULL,
   '71000000-0000-4000-8000-000000000001', NULL, NULL, NULL,
   '20000000-0000-4000-8000-000000000003',
   'Existe un hallazgo crítico sin respuesta.',
   'pendiente', TIMESTAMPTZ '2026-05-15 08:00:00-04', NULL),
  ('90000000-0000-4000-8000-000000000004',
   'AL-04', 'alta', NULL, NULL, NULL, NULL, NULL, NULL, NULL,
   '82000000-0000-4000-8000-000000000003',
   '20000000-0000-4000-8000-000000000004',
   'La evaluación de continuidad resultó no conforme.',
   'atendida', TIMESTAMPTZ '2026-07-08 08:00:00-04',
   TIMESTAMPTZ '2026-07-09 10:00:00-04'),
  ('90000000-0000-4000-8000-000000000005',
   'AL-07', 'alta', NULL, '50000000-0000-4000-8000-000000000005',
   NULL, NULL, NULL, NULL, NULL, NULL,
   '20000000-0000-4000-8000-000000000001',
   'Un control clave o relevante presenta efectividad reducida.',
   'atendida', TIMESTAMPTZ '2026-06-01 08:00:00-04',
   TIMESTAMPTZ '2026-06-02 10:00:00-04')
ON CONFLICT DO NOTHING;

INSERT INTO alerta_historial (
  id, alerta_id, usuario_id, evento, comentario, created_at
) VALUES
  ('91000000-0000-4000-8000-000000000001',
   '90000000-0000-4000-8000-000000000004',
   '20000000-0000-4000-8000-000000000004',
   'atencion',
   'Se registró un plan de acción con responsable y fecha límite.',
   TIMESTAMPTZ '2026-07-09 10:00:00-04'),
  ('91000000-0000-4000-8000-000000000002',
   '90000000-0000-4000-8000-000000000005',
   '20000000-0000-4000-8000-000000000001',
   'atencion',
   'El control será reemplazado por una revisión automatizada.',
   TIMESTAMPTZ '2026-06-02 10:00:00-04'),
  ('91000000-0000-4000-8000-000000000003',
   '90000000-0000-4000-8000-000000000005',
   '20000000-0000-4000-8000-000000000001',
   'comentario',
   'La automatización se encuentra en pruebas de aceptación.',
   TIMESTAMPTZ '2026-06-15 10:00:00-04')
ON CONFLICT DO NOTHING;

-- EVIDENCIAS: ENLACES Y METADATOS DE ARCHIVO ---------------------------------
-- Las URLs de example.com son demostrativas; no representan objetos de Storage.
INSERT INTO evidencias (
  id, tipo, riesgo_id, control_id, plan_id, accion_id, auditoria_id,
  hallazgo_id, evaluacion_id, nombre, tipo_mime, tamano_bytes,
  referencia_url, autor_id, created_at
) VALUES
  ('a0000000-0000-4000-8000-000000000001',
   'enlace', '40000000-0000-4000-8000-000000000002',
   NULL, NULL, NULL, NULL, NULL, NULL,
   'Tablero externo de monitoreo antifraude', NULL, NULL,
   'https://example.com/sgr-eg/demo/monitoreo-antifraude',
   '20000000-0000-4000-8000-000000000001',
   TIMESTAMPTZ '2026-06-20 10:00:00-04'),
  ('a0000000-0000-4000-8000-000000000002',
   'archivo', NULL, '50000000-0000-4000-8000-000000000001',
   NULL, NULL, NULL, NULL, NULL,
   'configuracion-control-antifraude.pdf', 'application/pdf', 245760,
   'https://example.com/sgr-eg/demo/configuracion-control-antifraude.pdf',
   '20000000-0000-4000-8000-000000000006',
   TIMESTAMPTZ '2026-06-22 10:00:00-04'),
  ('a0000000-0000-4000-8000-000000000003',
   'enlace', NULL, NULL, '60000000-0000-4000-8000-000000000001',
   NULL, NULL, NULL, NULL,
   'Cronograma del plan antifraude', NULL, NULL,
   'https://example.com/sgr-eg/demo/cronograma-antifraude',
   '20000000-0000-4000-8000-000000000002',
   TIMESTAMPTZ '2026-06-25 10:00:00-04'),
  ('a0000000-0000-4000-8000-000000000004',
   'archivo', NULL, NULL, NULL, '61000000-0000-4000-8000-000000000003',
   NULL, NULL, NULL,
   'resultado-simulacro-recuperacion.pdf', 'application/pdf', 524288,
   'https://example.com/sgr-eg/demo/resultado-simulacro.pdf',
   '20000000-0000-4000-8000-000000000006',
   TIMESTAMPTZ '2026-06-01 10:00:00-04'),
  ('a0000000-0000-4000-8000-000000000005',
   'archivo', NULL, NULL, NULL, NULL,
   '70000000-0000-4000-8000-000000000002', NULL, NULL,
   'programa-auditoria-antifraude.pdf', 'application/pdf', 180000,
   'https://example.com/sgr-eg/demo/programa-auditoria.pdf',
   '20000000-0000-4000-8000-000000000003',
   TIMESTAMPTZ '2026-05-01 10:00:00-04'),
  ('a0000000-0000-4000-8000-000000000006',
   'archivo', NULL, NULL, NULL, NULL, NULL,
   '71000000-0000-4000-8000-000000000002', NULL,
   'inventario-tratamientos-aprobado.pdf', 'application/pdf', 320000,
   'https://example.com/sgr-eg/demo/inventario-tratamientos.pdf',
   '20000000-0000-4000-8000-000000000004',
   TIMESTAMPTZ '2025-12-10 10:00:00-04'),
  ('a0000000-0000-4000-8000-000000000007',
   'enlace', NULL, NULL, NULL, NULL, NULL, NULL,
   '82000000-0000-4000-8000-000000000001',
   'Acta de revisión semestral', NULL, NULL,
   'https://example.com/sgr-eg/demo/acta-revision-semestral',
   '20000000-0000-4000-8000-000000000004',
   TIMESTAMPTZ '2026-07-05 10:00:00-04')
ON CONFLICT DO NOTHING;

-- Comprobaciones mínimas antes de confirmar.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM riesgos
    WHERE id = '40000000-0000-4000-8000-000000000006'
      AND estado = 'aceptado'
      AND justificacion_aceptacion IS NOT NULL
      AND aceptado_por IS NOT NULL
      AND fecha_revision IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'El escenario demo no contiene una aceptación válida';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM evaluaciones_cumplimiento
    WHERE id = '82000000-0000-4000-8000-000000000003'
      AND resultado = 'no_conforme'
      AND plan_accion IS NOT NULL
      AND responsable_plan_id IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'El escenario demo no contiene un plan de cumplimiento válido';
  END IF;
END $$;

COMMIT;

-- Resumen esperado de este escenario:
-- 3 países, 4 unidades, 6 usuarios, 8 riesgos, 5 controles,
-- 3 planes, 4 acciones, 3 auditorías, 3 hallazgos,
-- 3 normativas, 4 requisitos, 4 evaluaciones, 5 alertas y 7 evidencias.
