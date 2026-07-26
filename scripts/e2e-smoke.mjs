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
  "/compliance/regulations/new",
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
