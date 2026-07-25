const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:3000";

const login = await fetch(`${baseUrl}/api/auth/login`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    correo: "admin.sgr@gmail.com",
    password: "DemoSGR2026!",
  }),
});
if (!login.ok) {
  throw new Error(`Login E2E falló con ${login.status}: ${await login.text()}`);
}
const setCookie = login.headers.get("set-cookie");
const cookie = setCookie?.split(";")[0];
if (!cookie) throw new Error("Login E2E no devolvió cookie de sesión.");

const session = await fetch(`${baseUrl}/api/auth/session`, {
  headers: { cookie },
});
if (!session.ok) {
  throw new Error(`Consulta de sesión falló con ${session.status}.`);
}

const logout = await fetch(`${baseUrl}/api/auth/logout`, {
  method: "POST",
  headers: { cookie },
});
if (!logout.ok) throw new Error(`Logout E2E falló con ${logout.status}.`);

const revoked = await fetch(`${baseUrl}/api/auth/session`, {
  headers: { cookie },
});
if (revoked.status !== 401) {
  throw new Error(`La sesión revocada devolvió ${revoked.status}, se esperaba 401.`);
}

process.stdout.write("E2E login → sesión → logout → rechazo completado.\n");
