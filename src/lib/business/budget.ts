export type BudgetStatus = "ok" | "warning" | "exceeded";

export interface BudgetUsage {
  percentage: number;
  status: BudgetStatus;
}

/**
 * Calculates budget usage percentage and status.
 * - ok: < 70%
 * - warning: 70-99%
 * - exceeded: >= 100%
 */
export function calculateBudgetUsage(budgetCents: number, spentCents: number): BudgetUsage {
  if (budgetCents <= 0) {
    return {
      percentage: spentCents > 0 ? 100 : 0,
      status: spentCents > 0 ? "exceeded" : "ok",
    };
  }

  const percentage = Math.round((spentCents / budgetCents) * 100);

  let status: BudgetStatus;
  if (percentage >= 100) {
    status = "exceeded";
  } else if (percentage >= 70) {
    status = "warning";
  } else {
    status = "ok";
  }

  return { percentage, status };
}
