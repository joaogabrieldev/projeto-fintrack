import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { budgets, expenses } from "@/lib/db/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { getAuthenticatedUserId, unauthorizedResponse } from "@/lib/auth/session";
import { z } from "zod/v4";

const budgetSchema = z.object({
  categoryId: z.string().min(1),
  amountCents: z.number().int().positive().max(99999999),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100),
});

export async function GET(req: NextRequest) {
  const userId = await getAuthenticatedUserId();
  if (!userId) return unauthorizedResponse();

  const { searchParams } = req.nextUrl;
  const month = parseInt(searchParams.get("month") || String(new Date().getMonth() + 1));
  const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()));

  const userBudgets = await db
    .select()
    .from(budgets)
    .where(and(eq(budgets.userId, userId), eq(budgets.month, month), eq(budgets.year, year)));

  // Get spent amounts per category for this month
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  const spentByCategory = await db
    .select({
      categoryId: expenses.categoryId,
      total: sql<number>`SUM(${expenses.amountCents})`.as("total"),
    })
    .from(expenses)
    .where(
      and(
        eq(expenses.userId, userId),
        gte(expenses.date, startDate),
        lte(expenses.date, endDate)
      )
    )
    .groupBy(expenses.categoryId);

  const spentMap = new Map(spentByCategory.map((s) => [s.categoryId, s.total || 0]));

  const result = userBudgets.map((b) => ({
    ...b,
    spentCents: spentMap.get(b.categoryId) || 0,
  }));

  return NextResponse.json(result);
}

export async function POST(req: Request) {
  const userId = await getAuthenticatedUserId();
  if (!userId) return unauthorizedResponse();

  try {
    const body = await req.json();
    const result = budgetSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: result.error.flatten() },
        { status: 400 }
      );
    }

    const { categoryId, amountCents, month, year } = result.data;

    // Upsert: update if exists, insert if not
    const existing = await db.query.budgets.findFirst({
      where: and(
        eq(budgets.userId, userId),
        eq(budgets.categoryId, categoryId),
        eq(budgets.month, month),
        eq(budgets.year, year)
      ),
    });

    if (existing) {
      await db.update(budgets).set({ amountCents }).where(eq(budgets.id, existing.id));
      return NextResponse.json({ id: existing.id });
    }

    const id = crypto.randomUUID();
    await db.insert(budgets).values({ id, userId, categoryId, amountCents, month, year });

    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/budgets]", error);
    const message =
      process.env.NODE_ENV === "development"
        ? (error instanceof Error ? error.message : String(error))
        : "Erro interno do servidor";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
