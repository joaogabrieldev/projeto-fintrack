import { describe, it, expect } from "vitest";
import { centsToReais, reaisToCents } from "@/lib/business/currency";
import { calculateBudgetUsage } from "@/lib/business/budget";
import { aggregateByCategory, aggregateByDay } from "@/lib/business/aggregations";
import { validateExpenseInput } from "@/lib/business/validation";

describe("centsToReais", () => {
  it("formata corretamente valores grandes, zero e pequenos", () => {
    expect(centsToReais(123456)).toBe("R$\u00a01.234,56");
    expect(centsToReais(0)).toBe("R$\u00a00,00");
    expect(centsToReais(1)).toBe("R$\u00a00,01");
    expect(centsToReais(99999999)).toBe("R$\u00a0999.999,99");
  });
});

describe("reaisToCents", () => {
  it("rejeita valores negativos", () => {
    expect(() => reaisToCents(-10)).toThrow("Valor não pode ser negativo");
    expect(() => reaisToCents(-0.01)).toThrow("Valor não pode ser negativo");
  });

  it("lida com limite máximo de R$ 999.999,99", () => {
    expect(reaisToCents(999999.99)).toBe(99999999);
    expect(() => reaisToCents(1000000)).toThrow(
      "Valor máximo é R$ 999.999,99"
    );
  });

  it("converte valores decimais para centavos", () => {
    expect(reaisToCents(10.5)).toBe(1050);
    expect(reaisToCents(0.01)).toBe(1);
  });

  it("converte valores no formato brasileiro", () => {
    expect(reaisToCents("10,50")).toBe(1050);
    expect(reaisToCents("1.234,56")).toBe(123456);
    expect(reaisToCents("R$ 10,50")).toBe(1050);
  });

  it("rejeita valores inválidos", () => {
    expect(() => reaisToCents("abc")).toThrow("Valor inválido");
    expect(() => reaisToCents("")).toThrow("Valor inválido");
  });
});

describe("calculateBudgetUsage", () => {
 it("retorna warning exatamente em 70%", () => {
  const result = calculateBudgetUsage(10000, 7000);

  expect(result.percentage).toBe(70);
  expect(result.status).toBe("warning");
});

it("considera exceeded quando o percentual arredonda para 100%", () => {
  const result = calculateBudgetUsage(10000, 9999);

  expect(result.percentage).toBe(100);
  expect(result.status).toBe("exceeded");
});


it("retorna exceeded exatamente em 100%", () => {
  const result = calculateBudgetUsage(10000, 10000);

  expect(result.percentage).toBe(100);
  expect(result.status).toBe("exceeded");
});
});

describe("aggregateByCategory", () => {
  it("soma corretamente múltiplos gastos", () => {
    const expenses = [
      { categoryId: "food", amountCents: 1000, date: new Date() },
      { categoryId: "food", amountCents: 2500, date: new Date() },
      { categoryId: "transport", amountCents: 500, date: new Date() },
      { categoryId: null, amountCents: 300, date: new Date() },
    ];

    const result = aggregateByCategory(expenses);
    const foodTotal = result.find((r) => r.categoryId === "food");
    const transportTotal = result.find((r) => r.categoryId === "transport");
    const uncategorized = result.find((r) => r.categoryId === "uncategorized");

    expect(foodTotal?.total).toBe(3500);
    expect(transportTotal?.total).toBe(500);
    expect(uncategorized?.total).toBe(300);
    expect(result).toHaveLength(3);
  });

  it("retorna uma lista vazia quando não existem despesas", () => {
    const result = aggregateByCategory([]);

    expect(result).toEqual([]);
  });

  it("agrega corretamente uma única despesa", () => {
    const expenses = [
      {
        categoryId: "food",
        amountCents: 1500,
        date: new Date(),
      },
    ];

    const result = aggregateByCategory(expenses);

    expect(result).toEqual([
      {
        categoryId: "food",
        total: 1500,
      },
    ]);
  });

  it("agrupa despesas sem categoria como uncategorized", () => {
    const expenses = [
      { categoryId: null, amountCents: 1000, date: new Date() },
      { categoryId: null, amountCents: 2500, date: new Date() },
    ];

    const result = aggregateByCategory(expenses);

    expect(result).toEqual([
      {
        categoryId: "uncategorized",
        total: 3500,
      },
    ]);
  });

  it("mantém categorias diferentes separadas", () => {
    const expenses = [
      { categoryId: "food", amountCents: 1000, date: new Date() },
      { categoryId: "transport", amountCents: 2000, date: new Date() },
    ];

    const result = aggregateByCategory(expenses);

    expect(result).toHaveLength(2);
    expect(result.find((item) => item.categoryId === "food")?.total).toBe(1000);
    expect(result.find((item) => item.categoryId === "transport")?.total).toBe(
      2000
    );
  });
});


describe("aggregateByDay", () => {
  it("retorna array do tamanho correto mesmo com dias vazios", () => {
    const today = new Date();

    const expenses = [
      {
        categoryId: "food",
        amountCents: 1000,
        date: today,
      },
    ];

    const result7 = aggregateByDay(expenses, 7);
    const result30 = aggregateByDay(expenses, 30);

    expect(result7).toHaveLength(7);
    expect(result30).toHaveLength(30);

    const lastDay = result7[result7.length - 1];

    expect(lastDay.total).toBe(1000);

    const emptyDays = result7
      .slice(0, -1)
      .filter((day) => day.total === 0);

    expect(emptyDays).toHaveLength(6);
  });

  it("retorna totais zerados quando não existem despesas", () => {
    const result = aggregateByDay([], 3);

    expect(result).toHaveLength(3);
    expect(result.every((day) => day.total === 0)).toBe(true);
  });

  it("soma despesas que ocorreram no mesmo dia", () => {
    const today = new Date();

    const expenses = [
      {
        categoryId: "food",
        amountCents: 1000,
        date: today,
      },
      {
        categoryId: "food",
        amountCents: 2500,
        date: today,
      },
    ];

    const result = aggregateByDay(expenses, 7);
    const lastDay = result[result.length - 1];

    expect(lastDay.total).toBe(3500);
  });

  it("mantém despesas de dias diferentes separadas", () => {
    const today = new Date();

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const expenses = [
      {
        categoryId: "food",
        amountCents: 1000,
        date: yesterday,
      },
      {
        categoryId: "transport",
        amountCents: 2000,
        date: today,
      },
    ];

    const result = aggregateByDay(expenses, 7);

    expect(result[result.length - 2].total).toBe(1000);
    expect(result[result.length - 1].total).toBe(2000);
  });

  it("não inclui despesas fora do período solicitado", () => {
    const today = new Date();

    const oldDate = new Date(today);
    oldDate.setDate(oldDate.getDate() - 10);

    const expenses = [
      {
        categoryId: "food",
        amountCents: 5000,
        date: oldDate,
      },
    ];

    const result = aggregateByDay(expenses, 7);

    expect(result.every((day) => day.total === 0)).toBe(true);
  });
});


describe("validateExpenseInput", () => {
  it("rejeita data futura além de 1 dia", () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 3);

    const result = validateExpenseInput({
      amount: 1000,
      description: "Test expense",
      categoryId: null,
      date: futureDate.toISOString(),
    });

    expect(result.success).toBe(false);
  });

  it("aceita data de hoje e amanhã", () => {
    const today = new Date();

    const result = validateExpenseInput({
      amount: 1000,
      description: "Test expense",
      categoryId: null,
      date: today.toISOString(),
    });

    expect(result.success).toBe(true);
  });

  it("rejeita valor igual a zero", () => {
    const result = validateExpenseInput({
      amount: 0,
      description: "Teste",
      categoryId: null,
      date: new Date().toISOString(),
    });

    expect(result.success).toBe(false);
  });

  it("rejeita descrição vazia", () => {
    const result = validateExpenseInput({
      amount: 1000,
      description: "",
      categoryId: null,
      date: new Date().toISOString(),
    });

    expect(result.success).toBe(false);
  });

  it("rejeita descrição com apenas espaços", () => {
    const result = validateExpenseInput({
      amount: 1000,
      description: "   ",
      categoryId: null,
      date: new Date().toISOString(),
    });

    expect(result.success).toBe(false);
  });

  it("rejeita data anterior ao ano 2000", () => {
    const result = validateExpenseInput({
      amount: 1000,
      description: "Teste",
      categoryId: null,
      date: "1999-12-31T00:00:00.000Z",
    });

    expect(result.success).toBe(false);
  });

  it("rejeita data inválida", () => {
    const result = validateExpenseInput({
      amount: 1000,
      description: "Teste",
      categoryId: null,
      date: "data inválida",
    });

    expect(result.success).toBe(false);
  });
});
