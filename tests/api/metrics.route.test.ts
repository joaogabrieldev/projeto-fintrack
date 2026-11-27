// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

const METRICS_TOKEN = "token-de-teste-com-32-caracteres!";

// METRICS_TOKEN e NODE_ENV são lidos quando o módulo carrega: cada cenário importa a rota de novo.
async function importMetricsRoute(env: Record<string, string | undefined>) {
  vi.resetModules();
  for (const [name, value] of Object.entries(env)) vi.stubEnv(name, value);
  return import("@/app/api/metrics/route");
}

function buildRequest(authorization?: string) {
  return new Request("http://localhost/api/metrics", {
    headers: authorization ? { authorization } : {},
  });
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("GET /api/metrics", () => {
  it("expõe as métricas no formato do Prometheus em desenvolvimento", async () => {
    const { GET } = await importMetricsRoute({ NODE_ENV: "development", METRICS_TOKEN: "" });

    const response = await GET(buildRequest());
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/plain");
    expect(body).toContain("# TYPE http_requests_total counter");
    expect(body).toContain("# TYPE http_request_duration_seconds histogram");
    expect(body).toContain("# TYPE http_requests_in_flight gauge");
    expect(body).toContain("process_cpu_seconds_total");
  });

  it("fica desligado (404) em produção quando METRICS_TOKEN não está definido", async () => {
    const { GET } = await importMetricsRoute({ NODE_ENV: "production", METRICS_TOKEN: "" });

    const response = await GET(buildRequest());

    expect(response.status).toBe(404);
  });

  it("exige o Bearer token quando METRICS_TOKEN está definido", async () => {
    const { GET } = await importMetricsRoute({ NODE_ENV: "production", METRICS_TOKEN });

    expect((await GET(buildRequest())).status).toBe(401);
    expect((await GET(buildRequest("Bearer token-errado"))).status).toBe(401);
    expect((await GET(buildRequest(`Bearer ${METRICS_TOKEN}`))).status).toBe(200);
  });
});
