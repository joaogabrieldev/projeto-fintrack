import { createHash, timingSafeEqual } from "node:crypto";
import { metrics } from "@/lib/observability/metrics";
import { observabilityEnv } from "@/lib/observability/observability-env";

type MetricsAccess = "allowed" | "unauthorized" | "disabled";

// Hash antes de comparar: timingSafeEqual exige o mesmo tamanho e não pode vazar o tamanho do token.
function hasSameToken(received: string, expected: string): boolean {
  const receivedHash = createHash("sha256").update(received).digest();
  const expectedHash = createHash("sha256").update(expected).digest();
  return timingSafeEqual(receivedHash, expectedHash);
}

function getMetricsAccess(request: Request): MetricsAccess {
  const expectedToken = observabilityEnv.METRICS_TOKEN;

  if (!expectedToken) {
    // Em produção, métricas sem token ficariam públicas: o endpoint fica desligado.
    return process.env.NODE_ENV === "production" ? "disabled" : "allowed";
  }

  const authorization = request.headers.get("authorization") ?? "";
  const receivedToken = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";

  return hasSameToken(receivedToken, expectedToken) ? "allowed" : "unauthorized";
}

// Endpoint de scraping do Prometheus. Fica fora do instrumentRouteHandler de propósito:
// o scrape a cada 15 s inflaria o tráfego e distorceria os SLIs da API.
export async function GET(request: Request) {
  const access = getMetricsAccess(request);

  if (access === "disabled") {
    return new Response("Not Found", { status: 404 });
  }

  if (access === "unauthorized") {
    return new Response("Unauthorized", {
      status: 401,
      headers: { "WWW-Authenticate": 'Bearer realm="metrics"' },
    });
  }

  return new Response(await metrics.registry.metrics(), {
    headers: {
      "Content-Type": metrics.registry.contentType,
      "Cache-Control": "no-store",
    },
  });
}
