import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logger } from "@/lib/observability/logger";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

// Verificação de saúde (caixa-preta) usada pelo HEALTHCHECK do Docker e por monitores externos.
// Responde só o estado: nada de versão de banco, caminho ou mensagem de erro.
export async function GET() {
  const startedAt = performance.now();

  try {
    await db.run(sql`select 1`);

    return NextResponse.json(
      {
        status: "ok",
        checks: {
          database: { status: "ok", duration_ms: Math.round(performance.now() - startedAt) },
        },
        uptime_seconds: Math.round(process.uptime()),
      },
      { headers: NO_STORE_HEADERS }
    );
  } catch (error) {
    logger.error("health_check_failed", { check: "database", error });

    return NextResponse.json(
      { status: "error", checks: { database: { status: "error" } } },
      { status: 503, headers: NO_STORE_HEADERS }
    );
  }
}
