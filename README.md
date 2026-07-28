# SGR-EG

Sistema web de Gestión de Riesgos Empresariales Globales. Incluye riesgos,
controles, mitigación, auditorías, hallazgos, cumplimiento normativo, evidencias,
alertas, dashboard y bitácora con RBAC por unidad de negocio.

## Requisitos

- Node.js 22 y npm.
- PostgreSQL 16 o un proyecto Supabase.
- Para evidencias de archivo: bucket privado de Supabase Storage.
- Para notificaciones: servidor SMTP.
- Para respaldo/restauración: `pg_dump` y `pg_restore`.

## Variables de entorno

Copiar `.env.example` a `.env` y reemplazar todos los valores:

- `DATABASE_URL`: conexión agrupada utilizada por la aplicación.
- `DIRECT_URL`: conexión directa para migraciones, semillas y respaldo.
- `AUTH_JWT_SECRET`: secreto aleatorio de 32 caracteres o más.
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
  `SUPABASE_EVIDENCE_BUCKET`: Storage privado.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`:
  notificaciones de alertas. Si no están presentes, las alertas se conservan
  en la aplicación y el envío se registra como omitido.
- `PG_BIN`: directorio opcional de `pg_dump` y `pg_restore`. En Windows también
  se detectan automáticamente las instalaciones estándar de PostgreSQL.

No se deben versionar archivos `.env`.

## Instalación reproducible

```bash
npm ci
npm run db:migrate
npm run db:seed
npm run dev
```

La aplicación queda disponible en `http://localhost:3000`.

El administrador inicial para un ambiente sin datos se crea de forma
interactiva:

```bash
npm run bootstrap:admin -- --name "Administrador" --email "admin@example.com"
```

## Datos de demostración

La semilla usa exclusivamente información ficticia. Usuarios disponibles:

- `ana.analista@demo.sgr-eg.local`
- `carlos.propietario@demo.sgr-eg.local`
- `maria.auditora@demo.sgr-eg.local`
- `lucia.cumplimiento@demo.sgr-eg.local`
- `jorge.gerencia@demo.sgr-eg.local`
- `diego.tecnico@demo.sgr-eg.local`
- `admin.sgr@gmail.com` (administrador global)

Contraseña común: `DemoSGR2026!`.

La ejecución manual de todos los procesos, permisos y ciclos de vida está
documentada en
[`GUIA_PRUEBAS_GLOBALES_POR_ROL.md`](./GUIA_PRUEBAS_GLOBALES_POR_ROL.md).

## Calidad y pruebas

```bash
npm run lint
npm run typecheck
npm test
npm run test:coverage
npm run build
npm run system:check
```

Las pruebas E2E aplican por defecto un presupuesto de 3000 ms por respuesta;
puede ajustarse con `PERFORMANCE_BUDGET_MS` para diagnósticos controlados. El
inicio de sesión, que deriva la clave y registra una sesión auditada, usa un
límite independiente de 5000 ms configurable con
`AUTH_PERFORMANCE_BUDGET_MS`.

`npm run system:check` comprueba la conexión PostgreSQL, autenticación,
Storage privado, SMTP y disponibilidad de `pg_dump`/`pg_restore` sin mostrar
credenciales. Debe finalizar sin elementos `FALTA` antes de una puesta en
operación integral.

La suite `tests/cp-requirements.test.ts` cubre las reglas mínimas CP-01 a
CP-10. `tests/database.integration.test.ts` valida restricciones, triggers e
inmutabilidad sobre PostgreSQL cuando `RUN_DB_TESTS=true`. El pipeline levanta
PostgreSQL 16, aplica la migración y la semilla, ejecuta ambas suites, recorre
login/sesión/logout y el escenario integrado de riesgo, control, mitigación,
auditoría, hallazgo, cumplimiento, alertas y dashboard mediante
`npm run test:e2e`, analiza secretos y dependencias, compila la aplicación y
genera el artefacto de demostración. La creación de datos E2E se activa con
`RUN_MUTATING_E2E=true`; el smoke local ordinario es de consulta.

## Alertas

AL-01 a AL-07 se evalúan:

- al guardar riesgos, controles, planes, acciones, hallazgos, normativas,
  requisitos o evaluaciones;
- al iniciar el servidor y cada hora;
- manualmente desde configuración por un administrador autorizado.

La restricción parcial de PostgreSQL evita duplicar una alerta pendiente para
la misma regla, origen y destinatario.

## Respaldo y recuperación

Antes de una demostración:

```bash
npm run db:backup
```

El archivo verificable se genera dentro de `backups/`, directorio ignorado por
Git. Para restaurar en una base vacía:

```bash
ALLOW_DB_RESTORE=yes npm run db:restore -- backups/sgr-eg-fecha.dump
```

La restauración exige confirmación explícita y solo acepta archivos ubicados
dentro de `backups/`.

## API

El contrato está en [`openapi.yaml`](./openapi.yaml). Todas las respuestas JSON
siguen `{ data, message, errors }`; las descargas de evidencia son redirecciones
temporales autorizadas a Storage. El dashboard permite exportar los indicadores
filtrados en CSV y mantiene alias compatibles con las rutas mínimas del informe.

## Estructura

- `app/`: páginas y rutas REST de Next.js.
- `modules/`: componentes, validadores, servicios y repositorios por dominio.
- `prisma/migrations/`: reconstrucción completa del esquema PostgreSQL.
- `prisma/demo-data.sql`: semilla idempotente.
- `tests/`: pruebas automatizadas de requisitos.
- `scripts/`: creación de administrador, semilla, respaldo y recuperación.
