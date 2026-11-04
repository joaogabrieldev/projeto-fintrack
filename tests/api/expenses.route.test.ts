import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Cenário de teste da API de despesas (POST /api/expenses).
 *
 * Exercita diretamente o Route Handler real (`src/app/api/expenses/route.ts`),
 * que faz o parse do corpo, valida com o `expenseInputSchema` e persiste a
 * despesa. As dependências de infraestrutura — autenticação e banco de dados —
 * são substituídas por mocks, de modo que o teste valida a rota em si sem
 * precisar de um servidor HTTP ou de um banco real.
 *
 * - Caminho feliz: dados válidos  -> 201 e retorno do `id` da despesa.
 * - Caminho de erro: dados inválidos -> 400 com `{ error: "Dados inválidos" }`.
 */

// `vi.hoisted` garante que estes mocks existam antes dos factories de `vi.mock`,
// que são içados para o topo do módulo.
const { getAuthenticatedUserIdMock, insertMock, valuesMock } = vi.hoisted(() => {
  const valuesMock = vi.fn(async () => undefined);
  const insertMock = vi.fn(() => ({ values: valuesMock }));
  const getAuthenticatedUserIdMock = vi.fn(
    async (): Promise<string | null> => "user-test-id"
  );
  return { getAuthenticatedUserIdMock, insertMock, valuesMock };
});

// Autenticação: por padrão devolve um usuário autenticado.
vi.mock("@/lib/auth/session", () => ({
  getAuthenticatedUserId: getAuthenticatedUserIdMock,
  unauthorizedResponse: () =>
    new Response(JSON.stringify({ error: "Não autorizado" }), { status: 401 }),
}));

// Banco de dados: captura a chamada `db.insert(expenses).values({...})`.
vi.mock("@/lib/db", () => ({
  db: { insert: insertMock },
}));

import { POST } from "@/app/api/expenses/route";

function buildRequest(body: unknown): Request {
  return new Request("http://localhost/api/expenses", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/expenses", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAuthenticatedUserIdMock.mockResolvedValue("user-test-id");
  });

  it("cenário de sucesso: cria uma despesa válida e retorna 201 com o id", async () => {
    const dadosValidos = {
      amount: 15000, // R$ 150,00 (em centavos)
      description: "Compra no mercado",
      categoryId: null,
      date: "2026-10-28T12:00:00.000Z",
    };

    const res = await POST(buildRequest(dadosValidos));

    expect(res.status).toBe(201);

    const json = await res.json();
    expect(typeof json.id).toBe("string");
    expect(json.id.length).toBeGreaterThan(0);

    // A despesa válida deve ser persistida com os dados corretos.
    expect(insertMock).toHaveBeenCalledTimes(1);
    expect(valuesMock).toHaveBeenCalledTimes(1);
    expect(valuesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-test-id",
        amountCents: 15000,
        description: "Compra no mercado",
        categoryId: null,
      })
    );
  });

  it("cenário de erro: rejeita uma despesa inválida com 400 e não persiste nada", async () => {
    const dadosInvalidos = {
      amount: -100, // valor negativo
      description: "", // descrição vazia
      categoryId: null,
      date: "data-invalida", // data que não é uma data válida
    };

    const res = await POST(buildRequest(dadosInvalidos));

    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.error).toBe("Dados inválidos");
    expect(json.details).toBeDefined();

    // Nada deve ser inserido no banco quando a validação falha.
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("cenário de autorização: sem usuário autenticado retorna 401", async () => {
    getAuthenticatedUserIdMock.mockResolvedValue(null);

    const dadosValidos = {
      amount: 15000,
      description: "Compra no mercado",
      categoryId: null,
      date: "2026-10-28T12:00:00.000Z",
    };

    const res = await POST(buildRequest(dadosValidos));

    expect(res.status).toBe(401);
    expect(insertMock).not.toHaveBeenCalled();
  });
});
