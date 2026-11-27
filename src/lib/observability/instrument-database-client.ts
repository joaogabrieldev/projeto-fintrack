import type { Client, InArgs, InStatement, ResultSet } from "@libsql/client";
import { logger } from "./logger";
import { metrics } from "./metrics";
import { observabilityEnv } from "./observability-env";
import { runInSpan } from "./tracing";

export interface SqlStatementDescription {
  operation: "select" | "insert" | "update" | "delete" | "batch" | "other";
  table: string;
}

const SQL_OPERATION_PATTERN = /^\s*(select|insert|update|delete)\b/i;
const SQL_TABLE_PATTERN = /\b(?:from|into|update)\s+["`[]?(\w+)/i;
const MAX_QUERY_TEXT_LENGTH = 2000;

// Operação e tabela viram labels de métrica: o conjunto é fechado (4 verbos x tabelas do schema).
export function describeSqlStatement(sql: string): SqlStatementDescription {
  const operation = sql.match(SQL_OPERATION_PATTERN)?.[1]?.toLowerCase();
  const table = sql.match(SQL_TABLE_PATTERN)?.[1]?.toLowerCase() ?? "unknown";

  return {
    operation: (operation as SqlStatementDescription["operation"] | undefined) ?? "other",
    table,
  };
}

function getSqlText(statement: InStatement | [string, InArgs?]): string {
  if (typeof statement === "string") return statement;
  if (Array.isArray(statement)) return statement[0];
  return statement.sql;
}

async function traceQuery<T>(
  sql: string,
  description: SqlStatementDescription,
  runQuery: () => Promise<T>
): Promise<T> {
  const { operation, table } = description;
  const startedAt = performance.now();

  return runInSpan(
    `${operation.toUpperCase()} ${table}`,
    {
      "db.system.name": "sqlite",
      "db.operation.name": operation,
      "db.collection.name": table,
      // O Drizzle sempre parametriza: o texto tem "?" no lugar dos valores, sem dados do usuário.
      "db.query.text": sql.slice(0, MAX_QUERY_TEXT_LENGTH),
    },
    async () => {
      try {
        return await runQuery();
      } catch (error) {
        metrics.dbQueryErrorsTotal.inc({ operation, table });
        logger.error("db_query_failed", {
          operation,
          table,
          duration_ms: Math.round(performance.now() - startedAt),
          error,
        });
        throw error;
      } finally {
        const durationMs = performance.now() - startedAt;
        metrics.dbQueryDurationSeconds.observe({ operation, table }, durationMs / 1000);

        if (durationMs >= observabilityEnv.DB_SLOW_QUERY_MS) {
          logger.warn("db_slow_query", {
            operation,
            table,
            duration_ms: Math.round(durationMs),
            threshold_ms: observabilityEnv.DB_SLOW_QUERY_MS,
          });
        }
      }
    }
  );
}

/**
 * Envolve `execute` e `batch` do cliente libSQL, que são os métodos chamados pelo Drizzle.
 * Assim toda consulta gera span, métrica e log de lentidão, sem tocar em cada rota.
 */
export function instrumentDatabaseClient(client: Client): Client {
  const originalExecute = client.execute.bind(client) as (...args: unknown[]) => Promise<ResultSet>;
  const originalBatch = client.batch.bind(client);

  const execute = (statement: InStatement, args?: InArgs) => {
    const sql = getSqlText(statement);
    return traceQuery(sql, describeSqlStatement(sql), () => originalExecute(statement, args));
  };

  const batch: Client["batch"] = (statements, mode) => {
    const firstSql = statements[0] ? getSqlText(statements[0]) : "";
    const { table } = describeSqlStatement(firstSql);
    const sql = statements.map(getSqlText).join(";\n");
    return traceQuery(sql, { operation: "batch", table }, () => originalBatch(statements, mode));
  };

  return Object.assign(client, { execute, batch }) as Client;
}
