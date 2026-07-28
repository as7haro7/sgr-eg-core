-- Alinea la matriz de permisos con la Tabla 23 del informe.
-- Se reemplazan las asignaciones funcionales para evitar conservar privilegios
-- heredados que contradigan la matriz aprobada.
DELETE FROM permisos_rol
WHERE rol_id IN (
  SELECT id
  FROM roles
  WHERE nombre IN (
    'administrador',
    'analista_riesgos',
    'propietario_riesgo',
    'auditor_interno',
    'responsable_cumplimiento',
    'gerencia',
    'equipo_tecnico'
  )
);

WITH matriz(rol, modulo, crear, leer, actualizar, desactivar, alcance) AS (
  VALUES
    ('administrador','usuarios',true,true,true,true,'global'::alcance_permiso),
    ('administrador','organizacion',true,true,true,true,'global'::alcance_permiso),
    ('administrador','riesgos',false,true,false,false,'global'::alcance_permiso),
    ('administrador','mitigacion',false,true,false,false,'global'::alcance_permiso),
    ('administrador','auditorias',false,true,false,false,'global'::alcance_permiso),
    ('administrador','cumplimiento',false,true,false,false,'global'::alcance_permiso),
    ('administrador','alertas',false,true,false,false,'global'::alcance_permiso),
    ('administrador','reportes',false,true,false,false,'global'::alcance_permiso),
    ('administrador','bitacora',false,true,false,false,'global'::alcance_permiso),

    ('analista_riesgos','usuarios',false,true,false,false,'global'::alcance_permiso),
    ('analista_riesgos','riesgos',true,true,true,false,'unidad'::alcance_permiso),
    ('analista_riesgos','mitigacion',true,true,true,false,'unidad'::alcance_permiso),
    ('analista_riesgos','auditorias',false,true,false,false,'unidad'::alcance_permiso),
    ('analista_riesgos','cumplimiento',false,true,false,false,'unidad'::alcance_permiso),
    ('analista_riesgos','alertas',false,true,true,false,'unidad'::alcance_permiso),
    ('analista_riesgos','reportes',false,true,false,false,'unidad'::alcance_permiso),
    ('analista_riesgos','bitacora',false,true,false,false,'unidad'::alcance_permiso),

    ('propietario_riesgo','usuarios',false,true,false,false,'global'::alcance_permiso),
    ('propietario_riesgo','riesgos',false,true,true,false,'asignado'::alcance_permiso),
    ('propietario_riesgo','mitigacion',false,true,true,false,'asignado'::alcance_permiso),
    ('propietario_riesgo','auditorias',false,true,false,false,'asignado'::alcance_permiso),
    ('propietario_riesgo','cumplimiento',false,true,false,false,'asignado'::alcance_permiso),
    ('propietario_riesgo','alertas',false,true,true,false,'propio'::alcance_permiso),
    ('propietario_riesgo','reportes',false,true,false,false,'asignado'::alcance_permiso),
    ('propietario_riesgo','bitacora',false,true,false,false,'asignado'::alcance_permiso),

    ('auditor_interno','usuarios',false,true,false,false,'global'::alcance_permiso),
    ('auditor_interno','riesgos',false,true,false,false,'unidad'::alcance_permiso),
    ('auditor_interno','mitigacion',false,true,false,false,'unidad'::alcance_permiso),
    ('auditor_interno','auditorias',true,true,true,false,'asignado'::alcance_permiso),
    ('auditor_interno','cumplimiento',false,true,false,false,'unidad'::alcance_permiso),
    ('auditor_interno','alertas',false,true,true,false,'propio'::alcance_permiso),
    ('auditor_interno','reportes',false,true,false,false,'unidad'::alcance_permiso),
    ('auditor_interno','bitacora',false,true,false,false,'unidad'::alcance_permiso),

    ('responsable_cumplimiento','usuarios',false,true,false,false,'global'::alcance_permiso),
    ('responsable_cumplimiento','riesgos',false,true,false,false,'unidad'::alcance_permiso),
    ('responsable_cumplimiento','mitigacion',false,true,false,false,'unidad'::alcance_permiso),
    ('responsable_cumplimiento','auditorias',false,true,false,false,'unidad'::alcance_permiso),
    ('responsable_cumplimiento','cumplimiento',true,true,true,false,'unidad'::alcance_permiso),
    ('responsable_cumplimiento','alertas',false,true,true,false,'unidad'::alcance_permiso),
    ('responsable_cumplimiento','reportes',false,true,false,false,'unidad'::alcance_permiso),
    ('responsable_cumplimiento','bitacora',false,true,false,false,'unidad'::alcance_permiso),

    ('gerencia','usuarios',false,true,false,false,'global'::alcance_permiso),
    ('gerencia','riesgos',false,true,false,false,'global'::alcance_permiso),
    ('gerencia','mitigacion',false,true,false,false,'global'::alcance_permiso),
    ('gerencia','auditorias',false,true,false,false,'global'::alcance_permiso),
    ('gerencia','cumplimiento',false,true,false,false,'global'::alcance_permiso),
    ('gerencia','alertas',false,true,false,false,'global'::alcance_permiso),
    ('gerencia','reportes',false,true,false,false,'global'::alcance_permiso),
    ('gerencia','bitacora',false,true,false,false,'global'::alcance_permiso),

    ('equipo_tecnico','usuarios',false,true,false,false,'global'::alcance_permiso),
    ('equipo_tecnico','riesgos',false,false,false,true,'global'::alcance_permiso),
    ('equipo_tecnico','mitigacion',false,false,false,true,'global'::alcance_permiso),
    ('equipo_tecnico','auditorias',false,false,false,true,'global'::alcance_permiso),
    ('equipo_tecnico','cumplimiento',false,false,false,true,'global'::alcance_permiso),
    ('equipo_tecnico','alertas',false,true,false,false,'global'::alcance_permiso),
    ('equipo_tecnico','reportes',false,true,false,false,'global'::alcance_permiso),
    ('equipo_tecnico','bitacora',false,true,false,false,'global'::alcance_permiso)
)
INSERT INTO permisos_rol(
  rol_id, modulo_id, puede_crear, puede_leer, puede_actualizar,
  puede_desactivar, alcance
)
SELECT
  roles.id,
  modulos.id,
  matriz.crear,
  matriz.leer,
  matriz.actualizar,
  matriz.desactivar,
  matriz.alcance
FROM matriz
JOIN roles ON roles.nombre = matriz.rol
JOIN modulos ON modulos.codigo = matriz.modulo;
