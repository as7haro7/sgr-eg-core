# Guía de pruebas globales por rol — SGR-EG

## 1. Objetivo

Esta guía permite probar de extremo a extremo el Sistema de Gestión de Riesgos
Empresariales Globales con todos los roles, módulos y reglas principales.

Debe utilizarse para:

- comprobar que cada rol ve únicamente menús, datos y acciones autorizadas;
- recorrer los ciclos de riesgo, control, mitigación, auditoría, cumplimiento,
  alertas, evidencias y bitácora;
- validar mensajes, formularios, estados de carga y errores comprensibles;
- preparar una demostración funcional repetible.

Los datos indicados son ficticios. Agregue al título de cada registro el sufijo
`QA-AAAA-MM-DD-HHMM` para evitar confundir ejecuciones o provocar duplicados.

## 2. Preparación

1. Verificar que las migraciones y los datos demo estén aplicados:

   ```powershell
   npm.cmd run db:migrate
   npm.cmd run db:seed
   npm.cmd run system:check
   ```

2. Iniciar el sistema:

   ```powershell
   npm.cmd run dev
   ```

3. Abrir `http://localhost:3000`.
4. Usar una ventana privada diferente para cada rol o cerrar sesión antes de
   cambiar de usuario.
5. No ejecutar dos casos mutantes simultáneamente sobre el mismo registro.
6. No eliminar físicamente registros creados en las pruebas. Cuando exista la
   opción, desactivarlos o llevarlos a un estado terminal.

## 3. Usuarios de demostración

Contraseña común: `DemoSGR2026!`

| Rol | Usuario | Alcance esperado |
|---|---|---|
| Administrador | `admin.sgr@gmail.com` | Administración y consulta global |
| Analista de riesgos | `ana.analista@demo.sgr-eg.local` | Unidades La Paz y Santa Cruz |
| Propietario de riesgo | `carlos.propietario@demo.sgr-eg.local` | Registros asignados |
| Auditor interno | `maria.auditora@demo.sgr-eg.local` | Auditorías asignadas y unidades autorizadas |
| Cumplimiento | `lucia.cumplimiento@demo.sgr-eg.local` | Unidad Lima y cumplimiento autorizado |
| Gerencia | `jorge.gerencia@demo.sgr-eg.local` | Consulta y decisiones globales |
| Equipo técnico | `diego.tecnico@demo.sgr-eg.local` | Reportes, alertas y soporte global |

## 4. Resultado visual esperado para todos

En cada cuenta verificar:

- el nombre y correo corresponden al usuario autenticado;
- el dashboard indica el rol y alcance;
- los accesos rápidos no ofrecen operaciones prohibidas;
- el menú no muestra administración a roles funcionales;
- al cambiar de pantalla aparece la barra animada superior;
- una consulta lenta muestra el aviso `Preparando pantalla`;
- una operación `fetch` lenta muestra `Procesando información`;
- los botones que guardan muestran texto de progreso y quedan deshabilitados;
- un error de red conserva el formulario y muestra una explicación;
- formularios y modales pueden recorrerse con `Tab`;
- `Escape` cierra los diálogos cuando no hay una operación guardándose;
- en móvil no existe desplazamiento horizontal innecesario;
- con “reducir movimiento” del sistema operativo, las animaciones se reducen.

La animación global no debe aparecer en consultas menores a aproximadamente
300 ms. Esto evita que la interfaz parpadee.

## 5. Matriz esperada de pantallas y actividades

Leyenda: `G` gestionar, `C` consultar, `A` atender/asignado, `—` no debe
ofrecerse en navegación.

| Rol | Dashboard | Riesgos/mitigación | Auditorías | Cumplimiento | Alertas | Bitácora | Administración |
|---|---|---|---|---|---|---|---|
| Administrador | Global | C | C | C | C | C global | G |
| Analista | Riesgo/unidad | G unidad | C unidad | C unidad | G unidad | C unidad | — |
| Propietario | Asignado | A | C asignado | C asignado | A personal | C asignado | — |
| Auditor | Auditoría/unidad | C unidad | G asignado | C unidad | A personal | C unidad | — |
| Cumplimiento | Cumplimiento/unidad | C unidad | C unidad | G unidad | G unidad | C unidad | — |
| Gerencia | Ejecutivo global | C y aceptar | C | C | C global | C global | — |
| Equipo técnico | Operativo global | — | — | — | C global | C global | — |

Un permiso de lectura de usuarios u organización usado para llenar listas de
responsables no implica que el rol deba ver `Usuarios y roles`,
`Organización` o `Configuración` en el menú.

## 6. Datos para probar niveles de riesgo

El nivel inherente es `probabilidad × impacto`.

| Nivel | Probabilidad | Impacto | Resultado |
|---|---:|---:|---:|
| Bajo | 1 | 3 | 3 |
| Moderado | 2 | 4 | 8 |
| Alto | 4 | 4 | 16 |
| Crítico | 5 | 5 | 25 |

Rangos esperados con la configuración demo:

- Bajo: 1–4.
- Moderado: 5–9.
- Alto: 10–16.
- Crítico: 17–25.

Ejemplo de reducción residual:

1. Riesgo inherente `5 × 5 = 25`.
2. Control activo de 60 %: residual `25 × 0,40 = 10`.
3. Segundo control independiente de 50 %: residual
   `25 × 0,40 × 0,50 = 5`.
4. El sistema redondea/presenta el valor conforme a su regla central, pero
   siempre debe calcularlo en el backend.

## 7. Caso global A — ciclo completo de un riesgo crítico

### A.1 Crear el riesgo como Analista

Iniciar sesión como Ana y seleccionar `Registrar riesgo`.

| Campo | Dato sugerido |
|---|---|
| Título | `Interrupción crítica de pagos QA-AAAA-MM-DD-HHMM` |
| Categoría | Tecnológico |
| Unidad | Corporativo La Paz |
| Descripción | Caída total del servicio de pagos durante horario operativo |
| Causas | Falla del proveedor principal y ausencia de conmutación automática |
| Consecuencias | Pérdidas financieras, reclamos y daño reputacional |
| Objetivos afectados | Continuidad operativa y experiencia del cliente |
| Propietario | Carlos Mendoza |
| Probabilidad | 5 |
| Impacto | 5 |
| Exposición | 500000 |
| Moneda | BOB |

Resultados:

- la vista previa indica inherente 25 y nivel Crítico;
- se genera un código `R-2026-<correlativo>`;
- el estado inicial es `Identificado`;
- el registro aparece para Ana y Carlos;
- no aparece la transición `Aceptado` para Ana.

### A.2 Recorrer evaluación y apertura

Como Ana:

1. Cambiar `Identificado → En evaluación`.
2. Completar o revisar la valoración.
3. Cambiar `En evaluación → Abierto`.
4. Verificar que cada cambio aparezca en Bitácora.

Pruebas negativas:

- intentar continuar sin propietario: debe ser rechazado;
- no debe ofrecerse un salto directo a `Monitoreo` o `Cerrado`;
- Ana no debe poder aceptar el riesgo.

### A.3 Decisión de Gerencia

Iniciar sesión como Jorge:

1. Abrir `Riesgos` y filtrar por estado `Abierto`.
2. Abrir el riesgo QA.
3. Confirmar que puede consultar todos sus datos.
4. Confirmar que `Editar` no aparece.
5. Confirmar que `Aceptado` sí aparece cuando la transición es válida.

Para probar la rama de aceptación:

- justificación:
  `La exposición temporal fue aprobada por el comité mientras se implementa la redundancia.`;
- fecha de revisión: una fecha futura, por ejemplo `2026-10-30`.

Resultado: debe registrar usuario aprobador, fecha, justificación y revisión.
Después puede probar `Aceptado → Abierto`; la reapertura debe quedar auditada.

### A.4 Tratamiento mediante controles

Dejar el riesgo en `Abierto` y volver a Ana.

1. Cambiar `Abierto → En tratamiento`.
2. Abrir `Controles y mitigación`.
3. Crear control:

   | Campo | Dato |
   |---|---|
   | Descripción | Conmutación automática al proveedor secundario |
   | Tipo | Preventivo |
   | Efectividad | 60 |
   | Control clave | Sí |

4. Verificar que el residual pase aproximadamente de 25 a 10.
5. Editar la efectividad a 50 y comprobar:
   - nuevo residual;
   - historial con valor anterior/nuevo, usuario y fecha;
   - posible alerta AL-07 por reducción de control clave.
6. Adjuntar evidencia como enlace:
   - nombre: `Prueba de conmutación QA`;
   - URL: `https://example.com/qa/conmutacion`.

Pruebas negativas:

- efectividad 101 o negativa debe rechazarse;
- un ejecutable no debe aceptarse como evidencia;
- un usuario fuera del alcance no debe modificar el control.

### A.5 Plan y acciones de mitigación

Crear el plan:

| Campo | Dato |
|---|---|
| Descripción | Implantar redundancia integral del servicio de pagos |
| Responsable | Carlos Mendoza |
| Fecha límite | `2026-12-15` |
| Avance | 10 |

Crear dos acciones:

1. `Contratar proveedor secundario`, responsable Carlos, fecha
   `2026-10-30`, avance 20.
2. `Configurar monitoreo y conmutación`, responsable Diego, fecha
   `2026-11-30`, avance 0.

Como Carlos:

- debe ver el riesgo, plan y acciones asignadas;
- puede actualizar el avance permitido;
- no puede crear riesgos ni aceptar el riesgo;
- completar una acción con 100 % y estado `Completado`;
- adjuntar evidencia de la actividad.

### A.6 Monitoreo, cierre y reapertura

Como Ana:

1. Completar el tratamiento.
2. Cambiar `En tratamiento → Monitoreo`.
3. Revisar residual, evidencia y avance.
4. Cambiar `Monitoreo → Cerrado`.

Como Gerencia o usuario autorizado, comprobar la consulta. Si se prueba la
reactivación, usar `Cerrado → Abierto` y confirmar el evento en Bitácora.

Rama alternativa: desde `Identificado` o `En evaluación`, probar `Cancelado`
con un registro QA diferente cuando el evento que originó el riesgo dejó de
existir.

## 8. Caso global B — riesgos bajo, moderado y alto

Como Ana, crear tres riesgos con el mismo contexto general y cambiar solo:

| Título | Probabilidad | Impacto | Esperado |
|---|---:|---:|---|
| `Error menor de conciliación QA` | 1 | 3 | Bajo, 3 |
| `Retraso de reporte interno QA` | 2 | 4 | Moderado, 8 |
| `Fraude relevante no detectado QA` | 4 | 4 | Alto, 16 |

Verificar en el dashboard:

- la distribución aumenta exactamente en el nivel correspondiente;
- la celda correcta de la matriz de calor aumenta;
- los filtros por unidad, categoría, propietario, estado y periodo se combinan;
- `Limpiar` restaura la vista autorizada;
- exportar CSV conserva el mismo alcance del usuario.

## 9. Caso global C — auditoría y hallazgos

### C.1 Planificar como Auditor

Iniciar sesión como María:

| Campo | Dato |
|---|---|
| Objetivo | `Evaluar continuidad de pagos QA-AAAA-MM-DD-HHMM` |
| Alcance | Riesgo QA, controles, plan, evidencias y recuperación |
| Unidad | Corporativo La Paz |
| Responsable | María López |
| Inicio | `2026-08-10` |
| Fin | `2026-08-25` |
| Equipo | María López y Diego Rojas |

Resultados:

- estado `Planificada`;
- se visualiza todo el equipo;
- Ana y Gerencia pueden consultar según alcance, pero no editar;
- María puede editar y cambiar `Planificada → En ejecución`.

### C.2 Registrar hallazgo crítico

En la auditoría en ejecución:

| Campo | Dato |
|---|---|
| Severidad | Crítica |
| Condición | La conmutación no cumple el tiempo máximo de recuperación |
| Recomendación | Automatizar la conmutación y repetir el simulacro |
| Riesgo relacionado | Riesgo crítico QA |
| Responsable | Carlos Mendoza |
| Fecha límite | `2026-09-30` |
| Requiere evidencia | Sí, obligatorio |

Resultados:

- estado inicial `Abierto`;
- se genera AL-03 mientras el hallazgo crítico no tenga respuesta;
- no puede desmarcarse la evidencia obligatoria.

### C.3 Respuesta, seguimiento y cierre

Como Carlos, si el hallazgo está dentro de su alcance:

1. Responder:
   `Se configuró la automatización y se programó un nuevo simulacro.`
2. Verificar estado `En seguimiento` y fecha de respuesta.

Como María:

1. Intentar cerrar sin evidencia: debe fallar.
2. Adjuntar enlace o archivo de evidencia.
3. Cerrar el hallazgo.
4. Cerrar la auditoría `En ejecución → Cerrada`.

Una auditoría cerrada o cancelada no debe ofrecer edición ni nuevas
transiciones.

## 10. Caso global D — cumplimiento normativo

### D.1 Normativa y requisito

Iniciar sesión como Lucía:

1. Abrir `Cumplimiento → Normativas`.
2. Crear, si el alcance lo permite:

   | Campo | Dato |
   |---|---|
   | Nombre | Norma de continuidad digital QA |
   | Jurisdicción | Perú |
   | País | Perú Demo |
   | Versión | 1.0 |
   | Vigencia desde | `2026-08-01` |

3. Crear requisito:

   | Campo | Dato |
   |---|---|
   | Código | `CONT-QA-01` |
   | Descripción | Ejecutar pruebas semestrales de continuidad |
   | Criticidad | Alta |
   | Vigencia | `2026-08-01` en adelante |

4. Crear una nueva versión y confirmar que la anterior permanece en historial.

Pruebas negativas:

- un responsable con alcance de país no puede crear una normativa global;
- no se debe eliminar físicamente una versión histórica.

### D.2 Evaluaciones de los cuatro resultados

Utilizar periodos distintos para evitar la restricción
`requisito + unidad + periodo`.

| Resultado | Periodo sugerido | Datos adicionales |
|---|---|---|
| Conforme | 2027-01-01 a 2027-03-31 | Evidencia y observación positiva |
| Parcialmente conforme | 2027-04-01 a 2027-06-30 | Brecha parcial en observaciones |
| No conforme | 2027-07-01 a 2027-09-30 | Plan, responsable y fecha obligatorios |
| No aplicable | 2027-10-01 a 2027-12-31 | Justificación obligatoria |

Datos para `No conforme`:

- observación: `No se realizó el simulacro del periodo`;
- plan: `Ejecutar simulacro, documentar resultados y cerrar brechas`;
- responsable: Carlos Mendoza;
- fecha límite: `2027-10-31`.

Datos para `No aplicable`:

- justificación:
  `La unidad no opera servicios digitales incluidos por este requisito`.

Pruebas negativas:

- repetir exactamente requisito, unidad y periodo: debe rechazarse;
- fin anterior al inicio: debe rechazarse;
- `No conforme` sin plan/responsable/fecha: debe rechazarse;
- `No aplicable` sin justificación: debe rechazarse.

## 11. Caso global E — alertas AL-01 a AL-07

| Regla | Cómo provocarla | Destinatarios esperados |
|---|---|---|
| AL-01 | Residual mayor al apetito | Propietario, analista/unidad y Gerencia según regla |
| AL-02 | Plan o acción con fecha vencida | Responsables correspondientes |
| AL-03 | Hallazgo crítico sin respuesta | Auditor/responsables |
| AL-04 | Evaluación `No conforme` | Cumplimiento y responsables |
| AL-05 | Normativa o requisito próximo a vencer | Cumplimiento |
| AL-06 | Riesgo crítico sin propietario o plan activo | Analista y Gerencia |
| AL-07 | Reducir efectividad de control clave | Propietario y analista |

Procedimiento:

1. Crear o modificar el registro que dispara la regla.
2. Esperar la evaluación automática o ejecutar el motor como administrador.
3. Abrir `Alertas`.
4. Filtrar por pendiente y severidad.
5. Confirmar que ejecutar nuevamente el motor no duplica una alerta pendiente.
6. Como destinatario o gestor autorizado, atender con comentario:
   `Se verificó el origen y se asignó la acción correctiva QA.`
7. Confirmar estado `Atendida` e historial.
8. Reabrir con:
   `La acción no resolvió completamente la condición.`
9. Confirmar un evento nuevo; el comentario anterior debe conservarse.

Gerencia puede consultar la bandeja global, pero con permiso de solo lectura no
debe ver `Atender` ni `Reabrir`.

## 12. Caso global F — administración

Iniciar sesión como Administrador.

### Usuarios y roles

- crear un usuario QA con correo ficticio;
- asignar rol y unidad principal;
- impedir roles o unidades duplicadas;
- restablecer contraseña y confirmar evento en Bitácora;
- desactivar el usuario;
- comprobar que el usuario inactivo no inicia sesión;
- confirmar que no existe eliminación física.

### Organización

- crear país `País QA` con código ISO ficticio válido;
- crear dos unidades que compartan el país;
- editar una unidad;
- desactivar la unidad de prueba si no tiene relaciones bloqueantes.

### Configuración

- crear o editar categoría de riesgo;
- definir apetito global por categoría;
- definir excepción por unidad y periodo;
- comprobar que la excepción vigente tiene prioridad;
- revisar parámetros tipados:
  `evidencia_max_bytes`, `alerta_dias_vencimiento`, `sesion_minutos` y
  `criticidad_rangos`;
- ejecutar el motor de alertas;
- no mostrar controles de edición a usuarios sin permiso.

## 13. Caso global G — Equipo técnico

Iniciar sesión como Diego.

- debe ver dashboard operativo, alertas y bitácora global autorizada;
- no debe ver accesos administrativos solo porque puede consultar catálogos;
- no debe ver `Riesgos`, `Auditorías` ni `Cumplimiento` si carece de lectura;
- puede aparecer como responsable de una acción o integrante de auditoría;
- acceder desde la entidad asignada no debe ampliar permisos generales;
- comprobar indicadores de carga y mensajes de error de red;
- revisar que ningún mensaje muestre cadenas de conexión, consultas SQL,
  credenciales o trazas internas.

## 14. Pruebas de seguridad y alcance

Para cada rol:

1. Copiar la URL de una entidad global visible para Gerencia.
2. Abrirla con otro rol fuera del alcance.
3. El sistema debe responder con prohibición o no encontrado, nunca mostrar
   datos parciales.
4. Ocultar un botón no se considera autorización: repetir la operación contra
   la API debe devolver 403.
5. Cerrar sesión y volver a usar una URL protegida: debe redirigir a Login.
6. Una cookie revocada no debe recuperar la sesión.
7. Probar un UUID inválido: la página de detalle debe devolver 404.
8. Verificar que la bitácora respete alcance global, unidad, asignado o propio.

## 15. Pruebas de evidencias

Repetir al menos en riesgo, control, plan, acción, auditoría, hallazgo y
evaluación:

- crear enlace HTTPS válido;
- cargar PDF o imagen permitida si Storage está configurado;
- comprobar nombre, autor, fecha y entidad;
- rechazar `.exe`, tipos no permitidos y archivos mayores al máximo;
- impedir acceso desde un usuario sin permiso sobre la entidad;
- confirmar que una evidencia pertenece exactamente a una entidad;
- confirmar que la descarga usa una referencia temporal/autorizada.

## 16. Cierre y comprobaciones automatizadas

Ejecutar:

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
npm.cmd run test:e2e
```

Para las pruebas que crean el escenario integrado:

```powershell
$env:RUN_MUTATING_E2E='true'
npm.cmd run test:e2e
Remove-Item Env:RUN_MUTATING_E2E
```

La prueba mutante crea registros trazables. Debe ejecutarse en base de
desarrollo o QA, nunca en producción.

## 17. Registro de resultados

| ID | Rol | Caso | Resultado esperado | Resultado obtenido | Evidencia | Estado |
|---|---|---|---|---|---|---|
| QA-001 | Analista | Riesgo crítico | Nivel 25, sin opción Aceptado |  |  | Pendiente |
| QA-002 | Gerencia | Aceptación | Justificación, aprobador y revisión |  |  | Pendiente |
| QA-003 | Propietario | Acción asignada | Actualiza avance autorizado |  |  | Pendiente |
| QA-004 | Auditor | Hallazgo crítico | No cierra sin evidencia |  |  | Pendiente |
| QA-005 | Cumplimiento | No conforme | Exige plan completo |  |  | Pendiente |
| QA-006 | Administrador | Usuario inactivo | Login rechazado |  |  | Pendiente |
| QA-007 | Equipo técnico | Navegación | Sin módulos no autorizados |  |  | Pendiente |
| QA-008 | Todos | Carga lenta | Indicador visible y no bloqueante |  |  | Pendiente |

Una ejecución se considera aprobada cuando no existen accesos excedentes,
acciones faltantes, errores sin explicación, inconsistencias de alcance ni
casos obligatorios pendientes.
