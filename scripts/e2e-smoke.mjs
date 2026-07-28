const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:3000";
const performanceBudgetMs = Number(process.env.PERFORMANCE_BUDGET_MS ?? 3000);
const authPerformanceBudgetMs = Number(
  process.env.AUTH_PERFORMANCE_BUDGET_MS ?? 5000,
);

async function timedFetch(url, options, budgetMs = performanceBudgetMs) {
  const startedAt = performance.now();
  const response = await fetch(url, options);
  const duration = performance.now() - startedAt;
  if (duration > budgetMs) {
    throw new Error(
      `${url} tardó ${Math.round(duration)} ms; el máximo es ${budgetMs} ms.`,
    );
  }
  return response;
}

// Calienta el proceso y el pool de base de datos antes de medir uso estable.
const warmup = await fetch(`${baseUrl}/api/auth/session`);
if (warmup.status !== 401) {
  throw new Error(`La verificación inicial devolvió ${warmup.status}, se esperaba 401.`);
}

const login = await timedFetch(
  `${baseUrl}/api/auth/login`,
  {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      correo: "admin.sgr@gmail.com",
      password: "DemoSGR2026!",
    }),
  },
  authPerformanceBudgetMs,
);
if (!login.ok) {
  throw new Error(`Login E2E falló con ${login.status}: ${await login.text()}`);
}
const setCookie = login.headers.get("set-cookie");
const cookie = setCookie?.split(";")[0];
if (!cookie) throw new Error("Login E2E no devolvió cookie de sesión.");

const session = await timedFetch(`${baseUrl}/api/auth/session`, {
  headers: { cookie },
});
if (!session.ok) {
  throw new Error(`Consulta de sesión falló con ${session.status}.`);
}

// Calienta consultas agregadas y de alertas antes de medir el uso estable.
// La primera apertura también puede preparar TLS y la conexión remota.
await fetch(`${baseUrl}/`, { headers: { cookie } });
await fetch(`${baseUrl}/alerts`, { headers: { cookie } });

async function expectStatus(path, expected = 200) {
  const response = await timedFetch(`${baseUrl}${path}`, {
    headers: { cookie },
    redirect: "manual",
  });
  if (response.status !== expected) {
    throw new Error(
      `${path} devolvió ${response.status}; se esperaba ${expected}: ${(
        await response.text()
      ).slice(0, 500)}`,
    );
  }
  return response;
}

const pagePaths = [
  "/",
  "/?periodStart=&periodEnd=&unitId=&status=",
  "/?periodStart=fecha-invalida",
  "/risks?status=&categoryId=&page=",
  "/audits?status=&unitId=&page=",
  "/compliance?result=&unitId=&page=",
  "/compliance/regulations",
  "/alerts?status=&severity=&page=",
  "/settings",
  "/settings/audit-log?action=&entity=&page=",
  "/users",
];
for (const path of pagePaths) {
  await expectStatus(path);
}

for (const path of [
  "/risks/identificador-invalido",
  "/audits/identificador-invalido",
  "/compliance/evaluations/identificador-invalido",
  "/compliance/regulations/identificador-invalido",
  "/risks/00000000-0000-4000-8000-000000000000",
]) {
  await expectStatus(path, 404);
}

await expectStatus(
  "/api/dashboard/summary?periodStart=&periodEnd=&unitId=&status=",
);
await expectStatus("/api/dashboard/summary?periodStart=fecha-invalida", 400);

for (const [endpoint, detailPath] of [
  ["/api/risks?pageSize=1", "/risks/"],
  ["/api/audits?pageSize=1", "/audits/"],
  ["/api/compliance/evaluations?pageSize=1", "/compliance/evaluations/"],
  ["/api/regulations?pageSize=1", "/compliance/regulations/"],
]) {
  const response = await expectStatus(endpoint);
  const payload = await response.json();
  const item = payload.data?.items?.[0];
  if (item?.id) {
    await expectStatus(`${detailPath}${item.id}`);
    if (endpoint.startsWith("/api/risks")) {
      await expectStatus(`/risks/${item.id}/mitigation`);
    }
  }
}

async function loginAs(email) {
  const response = await timedFetch(
    `${baseUrl}/api/auth/login`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        correo: email,
        password: "DemoSGR2026!",
      }),
    },
    authPerformanceBudgetMs,
  );
  if (!response.ok) {
    throw new Error(`Login de ${email} falló: ${await response.text()}`);
  }
  const sessionCookie = response.headers.get("set-cookie")?.split(";")[0];
  if (!sessionCookie) throw new Error(`Login de ${email} no devolvió cookie.`);
  return sessionCookie;
}

async function api(sessionCookie, path, method = "GET", body) {
  const response = await timedFetch(`${baseUrl}${path}`, {
    method,
    headers: {
      cookie: sessionCookie,
      ...(body ? { "content-type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(
      `${method} ${path} devolvió ${response.status}: ${JSON.stringify(payload).slice(0, 500)}`,
    );
  }
  return payload.data;
}

const roleScenarios = [
  {
    email: "admin.sgr@gmail.com",
    role: "administrador",
    showsAdministration: true,
  },
  {
    email: "ana.analista@demo.sgr-eg.local",
    role: "analista_riesgos",
    showsAdministration: false,
  },
  {
    email: "carlos.propietario@demo.sgr-eg.local",
    role: "propietario_riesgo",
    showsAdministration: false,
  },
  {
    email: "maria.auditora@demo.sgr-eg.local",
    role: "auditor_interno",
    showsAdministration: false,
  },
  {
    email: "lucia.cumplimiento@demo.sgr-eg.local",
    role: "responsable_cumplimiento",
    showsAdministration: false,
  },
  {
    email: "jorge.gerencia@demo.sgr-eg.local",
    role: "gerencia",
    showsAdministration: false,
  },
  {
    email: "diego.tecnico@demo.sgr-eg.local",
    role: "equipo_tecnico",
    showsAdministration: false,
  },
];

for (const scenario of roleScenarios) {
  const roleCookie =
    scenario.email === "admin.sgr@gmail.com"
      ? cookie
      : await loginAs(scenario.email);
  await fetch(`${baseUrl}/`, { headers: { cookie: roleCookie } });
  await fetch(`${baseUrl}/alerts`, { headers: { cookie: roleCookie } });
  const roleSession = await timedFetch(`${baseUrl}/api/auth/session`, {
    headers: { cookie: roleCookie },
  });
  if (!roleSession.ok) {
    throw new Error(`Sesión de ${scenario.email} devolvió ${roleSession.status}.`);
  }
  const rolePayload = await roleSession.json();
  if (!rolePayload.data?.principal?.roleNames?.includes(scenario.role)) {
    throw new Error(
      `${scenario.email} no devolvió el rol esperado ${scenario.role}.`,
    );
  }

  const home = await timedFetch(`${baseUrl}/`, {
    headers: { cookie: roleCookie },
  });
  if (!home.ok) {
    throw new Error(`Dashboard de ${scenario.email} devolvió ${home.status}.`);
  }
  const html = await home.text();
  const administrationIsVisible =
    html.includes("Usuarios y roles") ||
    html.includes("Organización") ||
    html.includes("Configuración");
  if (administrationIsVisible !== scenario.showsAdministration) {
    throw new Error(
      `La navegación administrativa de ${scenario.email} no coincide con su rol.`,
    );
  }

  const alerts = await timedFetch(`${baseUrl}/alerts`, {
    headers: { cookie: roleCookie },
  });
  if (!alerts.ok) {
    throw new Error(`Alertas de ${scenario.email} devolvió ${alerts.status}.`);
  }
  if (scenario.email !== "admin.sgr@gmail.com") {
    const roleLogout = await timedFetch(`${baseUrl}/api/auth/logout`, {
      method: "POST",
      headers: { cookie: roleCookie },
    });
    if (!roleLogout.ok) {
      throw new Error(
        `Logout de ${scenario.email} devolvió ${roleLogout.status}.`,
      );
    }
  }
}

const technicalCookie = await loginAs("diego.tecnico@demo.sgr-eg.local");
const forbiddenRisks = await timedFetch(`${baseUrl}/api/risks?pageSize=1`, {
  headers: { cookie: technicalCookie },
});
if (forbiddenRisks.status !== 403) {
  throw new Error(
    `Riesgos para Equipo técnico devolvió ${forbiddenRisks.status}; se esperaba 403.`,
  );
}
const technicalLogout = await timedFetch(`${baseUrl}/api/auth/logout`, {
  method: "POST",
  headers: { cookie: technicalCookie },
});
if (!technicalLogout.ok) {
  throw new Error(`Logout técnico devolvió ${technicalLogout.status}.`);
}

process.stdout.write(
  "E2E de dashboard, navegación y alcance para los siete roles completado.\n",
);

if (process.env.RUN_MUTATING_E2E === "true") {
  const analystCookie = await loginAs("ana.analista@demo.sgr-eg.local");
  const [categories, units, users] = await Promise.all([
    api(analystCookie, "/api/risk-categories"),
    api(analystCookie, "/api/business-units"),
    api(analystCookie, "/api/users?pageSize=100"),
  ]);
  const category = categories.find((item) => item.status === "activo");
  const unit = units[0];
  const owner =
    users.items.find(
      (item) => item.email === "carlos.propietario@demo.sgr-eg.local",
    ) ??
    users.items[0];
  if (!category || !unit || !owner) {
    throw new Error("Faltan catálogos o usuarios para el escenario integrado.");
  }
  const unique = Date.now();
  const risk = await api(analystCookie, "/api/risks", "POST", {
    title: `Riesgo E2E ${unique}`,
    description: "Escenario integrado automatizado",
    causes: "Dependencia tecnológica",
    consequences: "Interrupción operativa",
    affectedObjectives: "Continuidad del negocio",
    categoryId: category.id,
    unitId: unit.id,
    ownerId: owner.id,
    probability: 5,
    impact: 5,
    financialExposure: 1000,
    currency: "USD",
  });
  await api(analystCookie, `/api/risks/${risk.id}/controls`, "POST", {
    description: "Control E2E",
    type: "preventivo",
    effectiveness: 50,
    isKey: true,
  });
  const future = new Date(Date.now() + 7 * 86_400_000)
    .toISOString()
    .slice(0, 10);
  await api(analystCookie, `/api/risks/${risk.id}/plans`, "POST", {
    description: "Plan E2E",
    responsibleId: owner.id,
    dueDate: future,
    progress: 10,
  });

  const auditorCookie = await loginAs("maria.auditora@demo.sgr-eg.local");
  const auditUsers = await api(auditorCookie, "/api/users?pageSize=100");
  const auditor =
    auditUsers.items.find(
      (item) => item.email === "maria.auditora@demo.sgr-eg.local",
    ) ??
    auditUsers.items[0];
  const today = new Date().toISOString().slice(0, 10);
  const audit = await api(auditorCookie, "/api/audits", "POST", {
    objective: `Auditoría E2E ${unique}`,
    scope: "Verificar el escenario automatizado",
    startDate: today,
    endDate: future,
    responsibleId: auditor.id,
    unitId: unit.id,
    teamMemberIds: [auditor.id],
  });
  await api(auditorCookie, `/api/audits/${audit.id}/findings`, "POST", {
    riskId: risk.id,
    severity: "critica",
    condition: "Condición E2E",
    recommendation: "Aplicar el plan definido",
    responsibleId: owner.id,
    deadline: future,
    requiresClosingEvidence: true,
  });

  const complianceCookie = await loginAs(
    "lucia.cumplimiento@demo.sgr-eg.local",
  );
  const regulations = await api(
    complianceCookie,
    "/api/regulations?pageSize=1&status=vigente",
  );
  const regulation = regulations.items[0];
  if (regulation) {
    const requirements = await api(
      complianceCookie,
      `/api/regulations/${regulation.id}/requirements?pageSize=1&active=true`,
    );
    const requirement = requirements.items[0];
    if (requirement) {
      const offset = unique % 300;
      const periodStart = new Date(Date.UTC(2030, 0, 1 + offset));
      const periodEnd = new Date(periodStart);
      periodEnd.setUTCDate(periodEnd.getUTCDate() + 1);
      await api(
        complianceCookie,
        `/api/requirements/${requirement.id}/assessments`,
        "POST",
        {
          unitId: unit.id,
          periodStart: periodStart.toISOString().slice(0, 10),
          periodEnd: periodEnd.toISOString().slice(0, 10),
          result: "parcialmente_conforme",
          observations: "Evaluación E2E",
        },
      );
    }
  }

  await api(cookie, "/api/alerts/engine", "POST");
  const managerCookie = await loginAs("jorge.gerencia@demo.sgr-eg.local");
  await api(managerCookie, "/api/dashboard/summary");
  process.stdout.write(
    "E2E integrado de riesgo, control, mitigación, auditoría, hallazgo, cumplimiento, alertas y dashboard completado.\n",
  );
}

const logout = await timedFetch(`${baseUrl}/api/auth/logout`, {
  method: "POST",
  headers: { cookie },
});
if (!logout.ok) throw new Error(`Logout E2E falló con ${logout.status}.`);

const revoked = await timedFetch(`${baseUrl}/api/auth/session`, {
  headers: { cookie },
});
if (revoked.status !== 401) {
  throw new Error(`La sesión revocada devolvió ${revoked.status}, se esperaba 401.`);
}

process.stdout.write(
  "E2E autenticación, páginas, filtros, detalles y revocación completado.\n",
);
