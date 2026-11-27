import { trace } from "@opentelemetry/api";
import { NextResponse } from "next/server";
import { logger } from "./logger";
import { metrics } from "./metrics";
import { getActiveTraceContext } from "./tracing";

export const REQUEST_ID_HEADER = "x-request-id";
export const TRACE_ID_HEADER = "x-trace-id";

// Aceita o id vindo de um proxy/cliente só se for "bem comportado", para não injetar lixo no log.
const REQUEST_ID_PATTERN = /^[\w.-]{1,128}$/;
const INTERNAL_ERROR_MESSAGE = "Erro interno do servidor";

function getRequestId(request: Request): string {
  const incomingRequestId = request.headers.get(REQUEST_ID_HEADER);

  return incomingRequestId && REQUEST_ID_PATTERN.test(incomingRequestId)
    ? incomingRequestId
    : crypto.randomUUID();
}

function createInternalErrorResponse(error: unknown): Response {
  // Em desenvolvimento a mensagem ajuda a depurar; fora dele, nunca expor detalhe interno.
  const message =
    process.env.NODE_ENV === "development" && error instanceof Error
      ? error.message
      : INTERNAL_ERROR_MESSAGE;

  return NextResponse.json({ error: message }, { status: 500 });
}

function setCorrelationHeaders(response: Response, requestId: string, traceId?: string) {
  try {
    response.headers.set(REQUEST_ID_HEADER, requestId);
    if (traceId) response.headers.set(TRACE_ID_HEADER, traceId);
  } catch {
    // Response.redirect() e afins têm headers imutáveis; a correlação continua pelo log.
  }
}

/**
 * Instrumenta um Route Handler com os sinais dourados: tráfego e erros (counter),
 * latência (histogram), saturação (gauge de requisições em andamento) e um log
 * estruturado por requisição, correlacionado ao trace pelo trace_id.
 *
 * `route` é o modelo da rota (`/api/expenses/[id]`), nunca o caminho real com ids:
 * cada id distinto viraria uma série nova no Prometheus.
 */
export function instrumentRouteHandler<TArgs extends [Request, ...unknown[]]>(
  route: string,
  handler: (...args: TArgs) => Promise<Response>
): (...args: TArgs) => Promise<Response> {
  return async (...args: TArgs) => {
    const [request] = args;
    const { method } = request;
    const requestId = getRequestId(request);
    const traceId = getActiveTraceContext()?.traceId;
    const startedAt = performance.now();

    trace.getActiveSpan()?.setAttribute("fintrack.request_id", requestId);
    metrics.httpRequestsInFlight.inc({ method, route });

    let response: Response;
    let unhandledError: unknown;

    try {
      response = await handler(...args);
    } catch (error) {
      unhandledError = error;
      response = createInternalErrorResponse(error);
    } finally {
      metrics.httpRequestsInFlight.dec({ method, route });
    }

    const durationMs = performance.now() - startedAt;
    const status = String(response.status);

    metrics.httpRequestsTotal.inc({ method, route, status });
    metrics.httpRequestDurationSeconds.observe({ method, route, status }, durationMs / 1000);

    const logFields = {
      method,
      route,
      status: response.status,
      duration_ms: Math.round(durationMs),
      request_id: requestId,
      ...(unhandledError !== undefined && { error: unhandledError }),
    };

    if (response.status >= 500) {
      logger.error("http_request_failed", logFields);
    } else {
      logger.info("http_request_completed", logFields);
    }

    setCorrelationHeaders(response, requestId, traceId);
    return response;
  };
}
