-- Los catálogos organizacionales son dependencias de los formularios
-- funcionales. Se habilita su consulta sin conceder mantenimiento.
WITH lectores(rol, alcance) AS (
  VALUES
    ('analista_riesgos','unidad'::alcance_permiso),
    ('propietario_riesgo','asignado'::alcance_permiso),
    ('auditor_interno','unidad'::alcance_permiso),
    ('responsable_cumplimiento','unidad'::alcance_permiso),
    ('gerencia','global'::alcance_permiso),
    ('equipo_tecnico','global'::alcance_permiso)
)
INSERT INTO permisos_rol(
  rol_id, modulo_id, puede_crear, puede_leer, puede_actualizar,
  puede_desactivar, alcance
)
SELECT
  roles.id,
  modulos.id,
  false,
  true,
  false,
  false,
  lectores.alcance
FROM lectores
JOIN roles ON roles.nombre = lectores.rol
JOIN modulos ON modulos.codigo = 'organizacion'
ON CONFLICT (rol_id, modulo_id) DO UPDATE SET
  puede_leer = true,
  alcance = EXCLUDED.alcance;
