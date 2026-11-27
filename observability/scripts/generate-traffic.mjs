// Gera tráfego de demonstração contra o FinTrack para alimentar painéis, logs e traces.
//
//   node observability/scripts/generate-traffic.mjs [baseUrl] [rodadas]
//   pnpm observability:traffic
//
// Cria um usuário de demonstração, faz login, registra e consulta gastos e provoca
// de propósito alguns 400, 404, falhas de login e um 500 (JSON malformado).

const BASE_URL = process.argv[2] ?? "http://localhost:3000";
const ROUNDS = Number(process.argv[3] ?? 20);

const DEMO_USER = {
  name: "Usuário de Demonstração",
  email: "demo.observabilidade@example.com",
  password: "Demo12345",
};

const cookieJar = new Map();

function storeCookies(response) {
  for (const cookie of response.headers.getSetCookie()) {
    const [pair] = cookie.split(";");
    const separatorIndex = pair.indexOf("=");
    cookieJar.set(pair.slice(0, separatorIndex), pair.slice(separatorIndex + 1));
  }
}

function getCookieHeader() {
  return [...cookieJar].map(([name, value]) => `${name}=${value}`).join("; ");
}

async function request(path, init = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    redirect: "manual",
    ...init,
    headers: { cookie: getCookieHeader(), ...init.headers },
  });
  storeCookies(response);
  return response;
}

function sendJson(path, method, body) {
  return request(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

async function logIn(password) {
  const { csrfToken } = await (await request("/api/auth/csrf")).json();
  return request("/api/auth/callback/credentials", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ csrfToken, email: DEMO_USER.email, password }),
  });
}

const statusCount = new Map();

function countStatus(label, response) {
  const key = `${label} ${response.status}`;
  statusCount.set(key, (statusCount.get(key) ?? 0) + 1);
}

async function main() {
  countStatus("POST /api/register", await sendJson("/api/register", "POST", DEMO_USER));
  countStatus("login válido", await logIn(DEMO_USER.password));

  for (let round = 1; round <= ROUNDS; round++) {
    const expense = {
      amount: 1000 + round * 137,
      description: `Gasto de demonstração ${round}`,
      categoryId: null,
      date: new Date().toISOString(),
    };

    countStatus("POST /api/expenses", await sendJson("/api/expenses", "POST", expense));
    countStatus("GET /api/expenses", await request("/api/expenses"));
    countStatus("GET /api/dashboard", await request("/api/dashboard"));

    // Erros de cliente (4xx): não consomem o error budget.
    if (round % 4 === 0) {
      countStatus(
        "POST /api/expenses inválido",
        await sendJson("/api/expenses", "POST", { amount: -1 })
      );
      countStatus(
        "DELETE /api/expenses/[id] inexistente",
        await request(`/api/expenses/${crypto.randomUUID()}`, { method: "DELETE" })
      );
    }

    // Erro de servidor (5xx): JSON malformado quebra o req.json() da rota.
    if (round % 5 === 0) {
      countStatus(
        "POST /api/expenses malformado",
        await sendJson("/api/expenses", "POST", "{nao-e-json")
      );
    }
  }

  // Falhas de login sem sessão alteram só o contador de tentativas.
  for (let attempt = 0; attempt < 5; attempt++) {
    countStatus("login inválido", await logIn("senha-errada-123"));
  }

  console.table(Object.fromEntries(statusCount));
}

main().catch((error) => {
  console.error(`Falha ao gerar tráfego contra ${BASE_URL}:`, error.message);
  process.exitCode = 1;
});
