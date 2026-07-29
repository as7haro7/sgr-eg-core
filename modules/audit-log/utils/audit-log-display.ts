import type { Prisma } from "@/generated/prisma/client";

export interface FormattedAuditDetail {
  current?: string;
  label: string;
  previous?: string;
  value?: string;
}

const actionLabels: Record<string, string> = {
  actualizar: "Actualización funcional",
  bootstrap: "Inicialización del sistema",
  cambiar_password: "Cambio de contraseña",
  configurar_acceso: "Configuración de acceso",
  crear: "Creación funcional",
  deactivate: "Desactivación",
  delete: "Eliminación",
  desactivar: "Desactivación",
  insert: "Creación",
  login: "Inicio de sesión",
  logout: "Cierre de sesión",
  reset_password: "Restablecimiento de contraseña",
  update: "Modificación",
};

const entityLabels: Record<string, string> = {
  acciones_mitigacion: "Acción de mitigación",
  alertas: "Alerta",
  apetitos_riesgo: "Apetito de riesgo",
  auditorias: "Auditoría",
  categorias_riesgo: "Categoría de riesgo",
  controles: "Control",
  evaluaciones_cumplimiento: "Evaluación de cumplimiento",
  evidencias: "Evidencia",
  hallazgos: "Hallazgo",
  normativas: "Normativa",
  paises: "País",
  parametros_sistema: "Parámetro del sistema",
  planes_mitigacion: "Plan de mitigación",
  requisitos: "Requisito",
  riesgos: "Riesgo",
  roles: "Rol",
  sesiones: "Sesión",
  unidades_negocio: "Unidad de negocio",
  usuarios: "Usuario",
};

const fieldLabels: Record<string, string> = {
  accion_id: "Acción",
  alerta_id: "Alerta",
  anterior: "Valor anterior",
  apetito_base: "Apetito base",
  archivo: "Archivo",
  categoria_id: "Categoría",
  clave: "Clave",
  comentario: "Comentario",
  control_id: "Control",
  creado_por: "Creado por",
  debe_cambiar_password: "Debe cambiar contraseña",
  deleted_at: "Fecha de desactivación",
  descripcion: "Descripción",
  es_principal: "Unidad principal",
  estado: "Estado",
  evaluacion_id: "Evaluación",
  evento: "Evento",
  fecha: "Fecha",
  fecha_limite: "Fecha límite",
  hallazgo_id: "Hallazgo",
  mensaje: "Mensaje",
  motivo: "Motivo",
  nombre: "Nombre",
  normativa_id: "Normativa",
  nuevo: "Valor nuevo",
  pais_id: "País",
  permisos_actualizados: "Permisos actualizados",
  plan_id: "Plan",
  progreso: "Progreso",
  requisito_id: "Requisito",
  responsable_id: "Responsable",
  riesgo_id: "Riesgo",
  roles: "Roles",
  roles_actualizados: "Roles actualizados",
  sesiones_revocadas: "Sesiones revocadas",
  tipo: "Tipo",
  unidad_id: "Unidad",
  unidades: "Unidades",
  unidades_actualizadas: "Unidades actualizadas",
  updated_at: "Última modificación",
  usuario_id: "Usuario",
  vigente_desde: "Vigente desde",
  vigente_hasta: "Vigente hasta",
};

const hiddenFields = new Set([
  "password_hash",
  "token_hash",
  "referencia_url",
]);

export function auditActionLabel(action: string): string {
  return actionLabels[action] ?? humanize(action);
}

export function auditEntityLabel(entity: string): string {
  return entityLabels[entity] ?? humanize(entity);
}

export function formatAuditDetails(
  details: Prisma.JsonValue,
): FormattedAuditDetail[] {
  if (!isRecord(details)) {
    return details === null
      ? []
      : [{ label: "Detalle", value: formatValue(details) }];
  }

  const previous = isRecord(details.anterior) ? details.anterior : null;
  const current = isRecord(details.nuevo) ? details.nuevo : null;
  if (previous || current) {
    const fields = new Set([
      ...Object.keys(previous ?? {}),
      ...Object.keys(current ?? {}),
    ]);

    return [...fields]
      .filter((field) => !hiddenFields.has(field))
      .filter(
        (field) =>
          JSON.stringify(previous?.[field]) !==
          JSON.stringify(current?.[field]),
      )
      .map((field) => ({
        label: fieldLabel(field),
        previous: formatValue(previous?.[field] ?? null),
        current: formatValue(current?.[field] ?? null),
      }));
  }

  return flattenDetails(details);
}

function flattenDetails(
  value: Prisma.JsonObject,
  prefix = "",
): FormattedAuditDetail[] {
  return Object.entries(value).flatMap(([key, item]) => {
    if (hiddenFields.has(key)) return [];
    const label = prefix
      ? `${prefix} · ${fieldLabel(key)}`
      : fieldLabel(key);

    if (isRecord(item)) {
      return flattenDetails(item, label);
    }
    if (Array.isArray(item) && item.some(isRecord)) {
      return item.flatMap((entry, index) =>
        isRecord(entry)
          ? flattenDetails(entry, `${label} ${index + 1}`)
          : [{ label: `${label} ${index + 1}`, value: formatValue(entry) }],
      );
    }

    return [{ label, value: formatValue(item) }];
  });
}

function fieldLabel(field: string): string {
  return fieldLabels[field] ?? humanize(field);
}

function humanize(value: string): string {
  const text = value.replaceAll("_", " ").trim();
  return text.length > 0
    ? `${text[0].toLocaleUpperCase("es")}${text.slice(1)}`
    : "Detalle";
}

function formatValue(value: Prisma.JsonValue | undefined): string {
  if (value === null || value === undefined || value === "") {
    return "Sin valor";
  }
  if (typeof value === "boolean") return value ? "Sí" : "No";
  if (typeof value === "number") {
    return new Intl.NumberFormat("es-BO").format(value);
  }
  if (typeof value === "string") {
    const parsedDate = /^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(value)
      ? new Date(value)
      : null;
    if (parsedDate && !Number.isNaN(parsedDate.getTime())) {
      return new Intl.DateTimeFormat("es-BO", {
        dateStyle: "medium",
        ...(value.includes("T") ? { timeStyle: "short" as const } : {}),
        timeZone: "America/La_Paz",
      }).format(parsedDate);
    }
    return humanizeKnownValue(value);
  }
  if (Array.isArray(value)) {
    return value.length > 0
      ? value.map((item) => formatValue(item)).join(", ")
      : "Ninguno";
  }
  return Object.entries(value)
    .map(([key, item]) => `${fieldLabel(key)}: ${formatValue(item)}`)
    .join(" · ");
}

function humanizeKnownValue(value: string): string {
  if (/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(value)) return value;
  if (/^[a-z][a-z0-9_]*$/i.test(value)) return humanize(value);
  return value;
}

function isRecord(
  value: Prisma.JsonValue | undefined,
): value is Prisma.JsonObject {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}
