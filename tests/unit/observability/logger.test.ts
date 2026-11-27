// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { context, trace } from "@opentelemetry/api";
import { AsyncLocalStorageContextManager } from "@opentelemetry/context-async-hooks";
import {
  BasicTracerProvider,
  InMemorySpanExporter,
  SimpleSpanProcessor,
} from "@opentelemetry/sdk-trace-base";

// O nível é lido quando o módulo carrega; cada teste importa uma instância nova.
async function importObservability(logLevel = "debug") {
  vi.resetModules();
  vi.stubEnv("LOG_LEVEL", logLevel);
  const [{ logger }, { runInSpan }] = await Promise.all([
    import("@/lib/observability/logger"),
    import("@/lib/observability/tracing"),
  ]);
  return { logger, runInSpan };
}

function captureLogLines() {
  const lines: string[] = [];
  for (const method of ["log", "warn", "error"] as const) {
    vi.spyOn(console, method).mockImplementation((line: unknown) => {
      lines.push(String(line));
    });
  }
  return () => lines.map((line) => JSON.parse(line) as Record<string, unknown>);
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  trace.disable();
  context.disable();
});

describe("logger estruturado", () => {
  it("escreve uma linha JSON com timestamp, nível, serviço e evento", async () => {
    const { logger } = await importObservability();
    const readLines = captureLogLines();

    logger.error("db_timeout", { duration_ms: 800 });

    const [record] = readLines();
    expect(record).toMatchObject({
      level: "ERROR",
      service: "fintrack",
      event: "db_timeout",
      duration_ms: 800,
    });
    expect(new Date(record.timestamp as string).toISOString()).toBe(record.timestamp);
  });

  it("mascara senhas, tokens, cookies, e-mails e chaves Pix em qualquer nível do objeto", async () => {
    const { logger } = await importObservability();
    const readLines = captureLogLines();

    logger.info("payload_recebido", {
      password: "Senha123!",
      user: { name: "Ana", email: "ana@example.com" },
      headers: { authorization: "Bearer abc.def", cookie: "authjs.session-token=xyz" },
      pixKey: "123.456.789-00",
      sessions: [{ accessToken: "tok_123" }],
    });

    const [record] = readLines();
    const serialized = JSON.stringify(record);

    for (const secret of [
      "Senha123!",
      "ana@example.com",
      "abc.def",
      "xyz",
      "123.456.789-00",
      "tok_123",
    ]) {
      expect(serialized).not.toContain(secret);
    }
    expect(record.password).toBe("[REDACTED]");
    expect(record.user).toEqual({ name: "Ana", email: "[REDACTED]" });
  });

  it("serializa erros com nome e mensagem", async () => {
    const { logger } = await importObservability();
    const readLines = captureLogLines();

    logger.error("db_query_failed", { error: new TypeError("conexão recusada") });

    const [record] = readLines();
    expect(record.error).toMatchObject({ name: "TypeError", message: "conexão recusada" });
  });

  it("descarta eventos abaixo do LOG_LEVEL configurado", async () => {
    const { logger } = await importObservability("warn");
    const readLines = captureLogLines();

    logger.debug("detalhe");
    logger.info("evento_esperado");
    logger.warn("situacao_anormal");

    expect(readLines().map((record) => record.event)).toEqual(["situacao_anormal"]);
  });

  it("inclui trace_id e span_id do span ativo para correlacionar log e trace", async () => {
    context.setGlobalContextManager(new AsyncLocalStorageContextManager().enable());
    trace.setGlobalTracerProvider(
      new BasicTracerProvider({
        spanProcessors: [new SimpleSpanProcessor(new InMemorySpanExporter())],
      })
    );

    const { logger, runInSpan } = await importObservability();
    const readLines = captureLogLines();

    const spanContext = await runInSpan("operacao_de_teste", {}, async (span) => {
      logger.info("dentro_do_span");
      return span.spanContext();
    });

    const [record] = readLines();
    expect(record.trace_id).toBe(spanContext.traceId);
    expect(record.span_id).toBe(spanContext.spanId);
  });
});
