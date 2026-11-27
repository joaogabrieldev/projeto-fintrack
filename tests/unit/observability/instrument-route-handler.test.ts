// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { context, trace } from "@opentelemetry/api";
import { AsyncLocalStorageContextManager } from "@opentelemetry/context-async-hooks";
import {
  BasicTracerProvider,
  InMemorySpanExporter,
  SimpleSpanProcessor,
} from "@opentelemetry/sdk-trace-base";
import { instrumentRouteHandler } from "@/lib/observability/instrument-route-handler";
import { metrics } from "@/lib/observability/metrics";

const ROUTE = "/api/expenses/[id]";

function buildRequest(headers: Record<string, string> = {}) {
  return new Request("http://localhost/api/expenses/7f1c2b9e-0000-4000-8000-000000000abc", {
    method: "PUT",
    headers,
  });
}

async function getCounterValue(labels: Record<string, string>) {
  const { values } = await metrics.httpRequestsTotal.get();
  return values.find((value) => {
    const valueLabels = value.labels as Record<string, string | number | undefined>;
    return Object.entries(labels).every(([name, label]) => valueLabels[name] === label);
  })?.value;
}

beforeEach(() => {
  metrics.registry.resetMetrics();
});

afterEach(() => {
  vi.restoreAllMocks();
  trace.disable();
  context.disable();
});

describe("instrumentRouteHandler", () => {
  it("conta a requisição com a rota-modelo e o status, e mede a latência", async () => {
    const handler = instrumentRouteHandler(ROUTE, async () => Response.json({ ok: true }));

    const response = await handler(buildRequest());

    expect(response.status).toBe(200);
    expect(await getCounterValue({ method: "PUT", route: ROUTE, status: "200" })).toBe(1);

    const { values } = await metrics.httpRequestDurationSeconds.get();
    expect(values).toContainEqual(
      expect.objectContaining({
        metricName: "http_request_duration_seconds_count",
        labels: { method: "PUT", route: ROUTE, status: "200" },
        value: 1,
      })
    );

    const inFlight = await metrics.httpRequestsInFlight.get();
    expect(inFlight.values[0]?.value).toBe(0);
  });

  it("nunca usa o id da URL como label (cardinalidade controlada)", async () => {
    const handler = instrumentRouteHandler(ROUTE, async () => new Response(null, { status: 204 }));

    await handler(buildRequest());

    expect(await metrics.registry.metrics()).not.toContain("7f1c2b9e");
  });

  it("repassa o contexto da rota (params) ao handler original", async () => {
    const original = vi.fn(
      async (_request: Request, { params }: { params: Promise<{ id: string }> }) =>
        Response.json(await params)
    );
    const handler = instrumentRouteHandler(ROUTE, original);

    const response = await handler(buildRequest(), { params: Promise.resolve({ id: "abc" }) });

    expect(await response.json()).toEqual({ id: "abc" });
  });

  it("transforma exceção em 500 genérico, sem vazar detalhe interno na resposta", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const handler = instrumentRouteHandler(ROUTE, async () => {
      throw new Error("SQLITE_ERROR: no such table: expenses (/app/data/fintrack.db)");
    });

    const response = await handler(buildRequest());
    const body = await response.text();

    expect(response.status).toBe(500);
    expect(JSON.parse(body)).toEqual({ error: "Erro interno do servidor" });
    expect(body).not.toMatch(/SQLITE|expenses|fintrack\.db|at .*\(/);
    expect(await getCounterValue({ route: ROUTE, status: "500" })).toBe(1);
  });

  it("devolve x-request-id: reaproveita um id válido e troca um id malformado", async () => {
    const handler = instrumentRouteHandler(ROUTE, async () => Response.json({}));

    const withValidId = await handler(buildRequest({ "x-request-id": "req-123" }));
    const withInvalidId = await handler(buildRequest({ "x-request-id": "id com espaço <script>" }));

    expect(withValidId.headers.get("x-request-id")).toBe("req-123");
    expect(withInvalidId.headers.get("x-request-id")).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("devolve x-trace-id do span ativo, o mesmo que vai no log da requisição", async () => {
    context.setGlobalContextManager(new AsyncLocalStorageContextManager().enable());
    trace.setGlobalTracerProvider(
      new BasicTracerProvider({
        spanProcessors: [new SimpleSpanProcessor(new InMemorySpanExporter())],
      })
    );
    // O tracer do módulo se liga ao provider global da importação: importa de novo depois de registrar.
    vi.resetModules();
    const [{ instrumentRouteHandler: instrument }, { runInSpan: runInActiveSpan }] =
      await Promise.all([
        import("@/lib/observability/instrument-route-handler"),
        import("@/lib/observability/tracing"),
      ]);
    const handler = instrument(ROUTE, async () => Response.json({}));

    const { response, traceId } = await runInActiveSpan(
      "PUT /api/expenses/[id]",
      {},
      async (span) => ({
        response: await handler(buildRequest()),
        traceId: span.spanContext().traceId,
      })
    );

    expect(traceId).not.toMatch(/^0+$/);
    expect(response.headers.get("x-trace-id")).toBe(traceId);
  });
});
