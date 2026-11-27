// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const { runMock } = vi.hoisted(() => ({ runMock: vi.fn() }));

vi.mock("@/lib/db", () => ({ db: { run: runMock } }));

import { GET } from "@/app/api/health/route";

beforeEach(() => {
  runMock.mockReset();
});

describe("GET /api/health", () => {
  it("responde 200 quando o banco responde", async () => {
    runMock.mockResolvedValue({ rows: [] });

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      status: "ok",
      checks: { database: { status: "ok" } },
    });
  });

  it("responde 503 quando o banco falha, sem expor a mensagem técnica", async () => {
    runMock.mockRejectedValue(new Error("connect ECONNREFUSED 10.0.0.5:8080 authToken=abc"));

    const response = await GET();
    const body = await response.text();

    expect(response.status).toBe(503);
    expect(JSON.parse(body)).toEqual({
      status: "error",
      checks: { database: { status: "error" } },
    });
    expect(body).not.toMatch(/ECONNREFUSED|10\.0\.0\.5|authToken/);
  });
});
