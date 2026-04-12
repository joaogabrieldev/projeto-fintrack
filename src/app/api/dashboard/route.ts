import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { expenses, budgets, goals } from "@/lib/db/schema";
import { eq, and, sql, desc } from "drizzle-orm";
import { getAuthenticatedUserId, unauthorizedResponse } from "@/lib/auth/session";

export async function GET() {
  const userId = await getAuthenticatedUserId();
  if (!userId) return unauthorizedResponse();

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  // Start of month
  const monthStart = new Date(currentYear, currentMonth - 1, 1);
  const monthStartTs = Math.floor(monthStart.getTime() / 1000);

  // Start of week (Monday)
  const weekStart = new Date(now);
  const dayOfWeek = weekStart.getDay() || 7;
  weekStart.setDate(weekStart.getDate() - dayOfWeek + 1);
  weekStart.setHours(0, 0, 0, 0);
  const weekStartTs = Math.floor(weekStart.getTime() / 1000);

  // 30 days ago
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoTs = Math.floor(thirtyDaysAgo.getTime() / 1000);

  const nowTs = Math.floor(now.getTime() / 1000);

  // Month total
  const [monthTotal] = await db
    .select({
      total: sql<number>`COALESCE(SUM(${expenses.amountCents}), 0)`.as("total"),
      count: sql<number>`COUNT(*)`.as("count"),
    })
    .from(expenses)
    .where(
      and(
        eq(expenses.userId, userId),
        sql`${expenses.date} >= ${monthStartTs}`,
        sql`${expenses.date} <= ${nowTs}`
      )
    );

  // Week total
  const [weekTotal] = await db
    .select({
      total: sql<number>`COALESCE(SUM(${expenses.amountCents}), 0)`.as("total"),
    })
    .from(expenses)
    .where(
      and(
        eq(expenses.userId, userId),
        sql`${expenses.date} >= ${weekStartTs}`,
        sql`${expenses.date} <= ${nowTs}`
      )
    );

  // By category (this month)
  const byCategory = await db
    .select({
      categoryId: expenses.categoryId,
      total: sql<number>`SUM(${expenses.amountCents})`.as("total"),
    })
    .from(expenses)
    .where(
      and(
        eq(expenses.userId, userId),
        sql`${expenses.date} >= ${monthStartTs}`,
        sql`${expenses.date} <= ${nowTs}`
      )
    )
    .groupBy(expenses.categoryId);

  // Daily totals (last 30 days)
  const dailyTotals = await db
    .select({
      day: sql<string>`DATE(${expenses.date}, 'unixepoch')`.as("day"),
      total: sql<number>`SUM(${expenses.amountCents})`.as("total"),
    })
    .from(expenses)
    .where(
      and(
        eq(expenses.userId, userId),
        sql`${expenses.date} >= ${thirtyDaysAgoTs}`,
        sql`${expenses.date} <= ${nowTs}`
      )
    )
    .groupBy(sql`DATE(${expenses.date}, 'unixepoch')`);

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
      and(
        eq(budgets.userId, userId),
        eq(budgets.month, currentMonth),
        eq(budgets.year, currentYear)
      )
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
    dailyTotals,
    recent,
    budgets: monthBudgets,
    goal,
  });
}
