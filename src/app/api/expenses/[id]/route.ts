import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { expenses } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getAuthenticatedUserId, unauthorizedResponse } from "@/lib/auth/session";
import { expenseInputSchema } from "@/lib/business/validation";
import { instrumentRouteHandler } from "@/lib/observability/instrument-route-handler";

interface ExpenseRouteContext {
  params: Promise<{ id: string }>;
}

export const PUT = instrumentRouteHandler(
  "/api/expenses/[id]",
  async (req: Request, { params }: ExpenseRouteContext) => {
    const userId = await getAuthenticatedUserId();
    if (!userId) return unauthorizedResponse();

    const { id } = await params;
    const body = await req.json();
    const result = expenseInputSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: result.error.flatten() },
        { status: 400 }
      );
    }

    const { amount, description, categoryId, date } = result.data;

    const updated = await db
      .update(expenses)
      .set({
        amountCents: amount,
        description,
        categoryId,
        date: new Date(date),
      })
      .where(and(eq(expenses.id, id), eq(expenses.userId, userId)));

    if (updated.rowsAffected === 0) {
      return NextResponse.json({ error: "Gasto não encontrado" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  }
);

export const DELETE = instrumentRouteHandler(
  "/api/expenses/[id]",
  async (_req: Request, { params }: ExpenseRouteContext) => {
    const userId = await getAuthenticatedUserId();
    if (!userId) return unauthorizedResponse();

    const { id } = await params;

    const deleted = await db
      .delete(expenses)
      .where(and(eq(expenses.id, id), eq(expenses.userId, userId)));

    if (deleted.rowsAffected === 0) {
      return NextResponse.json({ error: "Gasto não encontrado" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  }
);
