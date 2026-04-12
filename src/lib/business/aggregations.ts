export interface ExpenseForAggregation {
  categoryId: string | null;
  amountCents: number;
  date: Date;
}

export interface CategoryTotal {
  categoryId: string;
  total: number;
}

export interface DayTotal {
  date: string;
  total: number;
}

/**
 * Sums expenses by category.
 * Expenses with null categoryId are grouped under "uncategorized".
 */
export function aggregateByCategory(expenses: ExpenseForAggregation[]): CategoryTotal[] {
  const map = new Map<string, number>();

  for (const expense of expenses) {
    const key = expense.categoryId || "uncategorized";
    map.set(key, (map.get(key) || 0) + expense.amountCents);
  }

  return Array.from(map.entries()).map(([categoryId, total]) => ({
    categoryId,
    total,
  }));
}

/**
 * Aggregates expenses by day for the last N days.
 * Returns an array of length `days`, filling missing days with 0.
 */
export function aggregateByDay(expenses: ExpenseForAggregation[], days: number): DayTotal[] {
  const result: DayTotal[] = [];
  const now = new Date();

  // Build a map of date string → total
  const map = new Map<string, number>();
  for (const expense of expenses) {
    const dateStr = expense.date.toISOString().split("T")[0];
    map.set(dateStr, (map.get(dateStr) || 0) + expense.amountCents);
  }

  // Generate entries for the last N days
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    result.push({
      date: dateStr,
      total: map.get(dateStr) || 0,
    });
  }

  return result;
}
