import type { Instrumentation } from "next";

export async function register() {
  // O SDK Node do OpenTelemetry e o exporter OTLP não rodam no runtime Edge.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startTelemetry } = await import("./lib/observability/start-telemetry");
    startTelemetry();
  }
}

// Erros de render, Server Actions e proxy que não passam pelo instrumentRouteHandler.
export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const [{ logger }, { metrics }] = await Promise.all([
    import("./lib/observability/logger"),
    import("./lib/observability/metrics"),
  ]);

  metrics.serverRequestErrorsTotal.inc({ route_type: context.routeType });

  // routePath é o modelo da rota; request.path traria query string com dados digitados pelo usuário.
  logger.error("server_request_error", {
    method: request.method,
    route: context.routePath,
    route_type: context.routeType,
    error_digest: (error as { digest?: string }).digest,
    error,
  });
};
