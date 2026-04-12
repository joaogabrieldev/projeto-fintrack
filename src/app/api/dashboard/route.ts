import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { expenses, budgets, goals } from "@/lib/db/schema";
import { eq, and, gte, lte, sql, desc } from "drizzle-orm";
import { getAuthenticatedUserId, unauthorizedResponse } from "@/lib/auth/session";

export async function GET() {
  const userId = await getAuthenticatedUserId();
  if (!userId) return unauthorizedResponse();

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const monthStart = new Date(currentYear, currentMonth - 1, 1);
  const weekStart = new Date(now);
  const dayOfWeek = weekStart.getDay() || 7;
  weekStart.setDate(weekStart.getDate() - dayOfWeek + 1);
  weekStart.setHours(0, 0, 0, 0);
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Month total
  const [monthTotal] = await db
    .select({
      total: sql<number>`COALESCE(SUM(${expenses.amountCents}), 0)`.as("total"),
      count: sql<number>`COUNT(*)`.as("count"),
    })
    .from(expenses)
    .where(and(eq(expenses.userId, userId), gte(expenses.date, monthStart), lte(expenses.date, now)));

  // Week total
  const [weekTotal] = await db
    .select({
      total: sql<number>`COALESCE(SUM(${expenses.amountCents}), 0)`.as("total"),
    })
    .from(expenses)
    .where(and(eq(expenses.userId, userId), gte(expenses.date, weekStart), lte(expenses.date, now)));

  // By category (last 30 days — same window as the daily chart, used by pie chart)
  const byCategory = await db
    .select({
      categoryId: expenses.categoryId,
      total: sql<number>`SUM(${expenses.amountCents})`.as("total"),
    })
    .from(expenses)
    .where(and(eq(expenses.userId, userId), gte(expenses.date, thirtyDaysAgo), lte(expenses.date, now)))
    .groupBy(expenses.categoryId);

  // By category (this month — used by budget progress bars)
  const byCategoryMonth = await db
    .select({
      categoryId: expenses.categoryId,
      total: sql<number>`SUM(${expenses.amountCents})`.as("total"),
    })
    .from(expenses)
    .where(and(eq(expenses.userId, userId), gte(expenses.date, monthStart), lte(expenses.date, now)))
    .groupBy(expenses.categoryId);

  // Daily totals (last 30 days) - group by date string
  const dailyRaw = await db
    .select({
      date: expenses.date,
      total: sql<number>`SUM(${expenses.amountCents})`.as("total"),
    })
    .from(expenses)
    .where(
      and(eq(expenses.userId, userId), gte(expenses.date, thirtyDaysAgo), lte(expenses.date, now))
    )
    .groupBy(expenses.date);

  // Normalize daily totals to { day: "YYYY-MM-DD", total }
  const dailyTotals = Object.values(
    dailyRaw.reduce<Record<string, { day: string; total: number }>>((acc, row) => {
      const d = row.date instanceof Date ? row.date : new Date(row.date);
      const day = d.toISOString().split("T")[0];
      if (!acc[day]) acc[day] = { day, total: 0 };
      acc[day].total += row.total;
      return acc;
    }, {})
  );

  // Recent 5
  const recent = await db
    .select()
    .from(expenses)
    .where(eq(expenses.userId, userId))
    .orderBy(desc(expenses.date))
    .limit(5);

  // Budgets for this month
  const monthBudgets = await db
    .select()
    .from(budgets)
    .where(
      and(eq(budgets.userId, userId), eq(budgets.month, currentMonth), eq(budgets.year, currentYear))
    );

  // Goal for this month
  const goal = await db.query.goals.findFirst({
    where: and(
      eq(goals.userId, userId),
      eq(goals.month, currentMonth),
      eq(goals.year, currentYear)
    ),
  });

  return NextResponse.json({
    monthTotal: monthTotal.total,
    weekTotal: weekTotal.total,
    transactionCount: monthTotal.count,
    byCategory,
    byCategoryMonth,
    dailyTotals,
    recent,
    budgets: monthBudgets,
    goal,
  });
}
