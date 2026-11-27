import { collectDefaultMetrics, Counter, Gauge, Histogram, Registry } from "@prometheus-io/client";

// Faixas em segundos: o SLO de latência (500 ms) precisa cair exatamente numa borda.
const HTTP_DURATION_BUCKETS_SECONDS = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10];
const DB_DURATION_BUCKETS_SECONDS = [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5];

// Labels só com valores de conjunto fechado (método, rota-modelo, status, operação).
// Nunca id de usuário, id de despesa ou e-mail: cada valor novo vira uma série temporal nova.
function createMetrics() {
  const registry = new Registry();
  collectDefaultMetrics({ register: registry });

  return {
    registry,
    httpRequestsTotal: new Counter({
      name: "http_requests_total",
      help: "Total de requisições HTTP atendidas pela API (tráfego e erros).",
      labelNames: ["method", "route", "status"] as const,
      registers: [registry],
    }),
    httpRequestDurationSeconds: new Histogram({
      name: "http_request_duration_seconds",
      help: "Duração das requisições HTTP da API, em segundos (latência).",
      labelNames: ["method", "route", "status"] as const,
      buckets: HTTP_DURATION_BUCKETS_SECONDS,
      registers: [registry],
    }),
    httpRequestsInFlight: new Gauge({
      name: "http_requests_in_flight",
      help: "Requisições HTTP em andamento neste momento (saturação).",
      labelNames: ["method", "route"] as const,
      registers: [registry],
    }),
    dbQueryDurationSeconds: new Histogram({
      name: "db_query_duration_seconds",
      help: "Duração das consultas ao banco, em segundos.",
      labelNames: ["operation", "table"] as const,
      buckets: DB_DURATION_BUCKETS_SECONDS,
      registers: [registry],
    }),
    dbQueryErrorsTotal: new Counter({
      name: "db_query_errors_total",
      help: "Total de consultas ao banco que falharam.",
      labelNames: ["operation", "table"] as const,
      registers: [registry],
    }),
    authLoginAttemptsTotal: new Counter({
      name: "auth_login_attempts_total",
      help: "Tentativas de login por resultado (success ou invalid_credentials).",
      labelNames: ["result"] as const,
      registers: [registry],
    }),
    serverRequestErrorsTotal: new Counter({
      name: "server_request_errors_total",
      help: "Erros capturados pelo Next.js fora das rotas instrumentadas (render, action, proxy).",
      labelNames: ["route_type"] as const,
      registers: [registry],
    }),
  };
}

export type Metrics = ReturnType<typeof createMetrics>;

// O Next pode avaliar este módulo mais de uma vez no mesmo processo (bundles por rota e HMR).
// Sem o globalThis, cada rota teria contadores próprios e o /api/metrics mostraria só os dele.
const globalForMetrics = globalThis as typeof globalThis & { fintrackMetrics?: Metrics };

export const metrics = (globalForMetrics.fintrackMetrics ??= createMetrics());
