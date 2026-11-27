// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Client } from "@libsql/client";

async function importInstrumentation(env: Record<string, string> = {}) {
  vi.resetModules();
  vi.stubEnv("LOG_LEVEL", "debug");
  for (const [name, value] of Object.entries(env)) vi.stubEnv(name, value);

  const [instrumentation, { metrics }] = await Promise.all([
    import("@/lib/observability/instrument-database-client"),
    import("@/lib/observability/metrics"),
  ]);
  metrics.registry.resetMetrics();
  return { ...instrumentation, metrics };
}

function createFakeClient(execute: Client["execute"]) {
  return { execute, batch: vi.fn(async () => []) } as unknown as Client;
}

function captureLogEvents() {
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
});

describe("describeSqlStatement", () => {
  it.each([
    ['select "id", "name" from "users" where "users"."email" = ?', "select", "users"],
    ['insert into "expenses" ("id", "amount_cents") values (?, ?)', "insert", "expenses"],
    ['update "budgets" set "amount_cents" = ? where "budgets"."id" = ?', "update", "budgets"],
    ['delete from "categories" where "categories"."id" = ?', "delete", "categories"],
    ["select 1", "select", "unknown"],
    ["pragma table_info(users)", "other", "unknown"],
  ])("%s -> %s em %s", async (sql, operation, table) => {
    const { describeSqlStatement } = await importInstrumentation();

    expect(describeSqlStatement(sql)).toEqual({ operation, table });
  });
});

describe("instrumentDatabaseClient", () => {
  it("repassa a consulta e registra a duração por operação e tabela", async () => {
    const { instrumentDatabaseClient, metrics } = await importInstrumentation();
    const execute = vi.fn(async () => ({ rows: [] }));
    const client = instrumentDatabaseClient(
      createFakeClient(execute as unknown as Client["execute"])
    );
    const statement = { sql: 'select "id" from "expenses" where "user_id" = ?', args: ["u1"] };

    await client.execute(statement);

    expect(execute).toHaveBeenCalledWith(statement, undefined);
    const { values } = await metrics.dbQueryDurationSeconds.get();
    const count = values.find((value) => value.metricName === "db_query_duration_seconds_count");
    expect(count).toMatchObject({ labels: { operation: "select", table: "expenses" }, value: 1 });
  });

  it("emite WARN db_slow_query quando a consulta passa do limite", async () => {
    const { instrumentDatabaseClient } = await importInstrumentation({ DB_SLOW_QUERY_MS: "5" });
    const readLogEvents = captureLogEvents();
    const slowExecute = async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
      return { rows: [] };
    };
    const client = instrumentDatabaseClient(
      createFakeClient(slowExecute as unknown as Client["execute"])
    );

    await client.execute('update "goals" set "target_cents" = ? where "goals"."id" = ?');

    const slowQueryLog = readLogEvents().find((record) => record.event === "db_slow_query");
    expect(slowQueryLog).toMatchObject({ level: "WARN", operation: "update", table: "goals" });
    expect(slowQueryLog?.duration_ms).toBeGreaterThanOrEqual(5);
  });

  it("conta a falha, registra ERROR e propaga o erro original", async () => {
    const { instrumentDatabaseClient, metrics } = await importInstrumentation();
    const readLogEvents = captureLogEvents();
    const failure = new Error("SQLITE_BUSY: database is locked");
    const client = instrumentDatabaseClient(
      createFakeClient((async () => {
        throw failure;
      }) as unknown as Client["execute"])
    );

    await expect(client.execute('delete from "expenses" where "id" = ?')).rejects.toBe(failure);

    const { values } = await metrics.dbQueryErrorsTotal.get();
    expect(values).toEqual([
      expect.objectContaining({ labels: { operation: "delete", table: "expenses" }, value: 1 }),
    ]);
    expect(readLogEvents()).toContainEqual(
      expect.objectContaining({ level: "ERROR", event: "db_query_failed", table: "expenses" })
    );
  });
});
