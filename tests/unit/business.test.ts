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
    expect(() => reaisToCents(1000000)).toThrow("Valor máximo é R$ 999.999,99");
  });
});

describe("calculateBudgetUsage", () => {
  it("retorna ok quando <70%, warning 70-99%, exceeded >=100%", () => {
    const ok = calculateBudgetUsage(10000, 5000);
    expect(ok.percentage).toBe(50);
    expect(ok.status).toBe("ok");

    const warning = calculateBudgetUsage(10000, 8000);
    expect(warning.percentage).toBe(80);
    expect(warning.status).toBe("warning");

    const exceeded = calculateBudgetUsage(10000, 10000);
    expect(exceeded.percentage).toBe(100);
    expect(exceeded.status).toBe("exceeded");

    const over = calculateBudgetUsage(10000, 15000);
    expect(over.percentage).toBe(150);
    expect(over.status).toBe("exceeded");
  });

  it("com orçamento zero não explode", () => {
    const noSpend = calculateBudgetUsage(0, 0);
    expect(noSpend.percentage).toBe(0);
    expect(noSpend.status).toBe("ok");

    const withSpend = calculateBudgetUsage(0, 5000);
    expect(withSpend.percentage).toBe(100);
    expect(withSpend.status).toBe("exceeded");
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
});

describe("aggregateByDay", () => {
  it("retorna array do tamanho correto mesmo com dias vazios", () => {
    const today = new Date();
    const expenses = [{ categoryId: "food", amountCents: 1000, date: today }];

    const result7 = aggregateByDay(expenses, 7);
    expect(result7).toHaveLength(7);

    const result30 = aggregateByDay(expenses, 30);
    expect(result30).toHaveLength(30);

    // Last day should have the expense
    const lastDay = result7[result7.length - 1];
    expect(lastDay.total).toBe(1000);

    // Earlier days should be zero
    const emptyDays = result7.slice(0, -1).filter((d) => d.total === 0);
    expect(emptyDays.length).toBe(6);
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
});
