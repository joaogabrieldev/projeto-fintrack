import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { expenses } from "@/lib/db/schema";
import { eq, and, gte, lte, like, desc } from "drizzle-orm";
import { getAuthenticatedUserId, unauthorizedResponse } from "@/lib/auth/session";
import { expenseInputSchema } from "@/lib/business/validation";

export async function GET(req: NextRequest) {
  const userId = await getAuthenticatedUserId();
  if (!userId) return unauthorizedResponse();

  const { searchParams } = req.nextUrl;
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  const categoryId = searchParams.get("categoryId");
  const search = searchParams.get("search");

  const conditions = [eq(expenses.userId, userId)];

  if (dateFrom) {
    conditions.push(gte(expenses.date, new Date(dateFrom)));
  }
  if (dateTo) {
    conditions.push(lte(expenses.date, new Date(dateTo)));
  }
  if (categoryId) {
    conditions.push(eq(expenses.categoryId, categoryId));
  }
  if (search) {
    conditions.push(like(expenses.description, `%${search}%`));
  }

  const result = await db
    .select()
    .from(expenses)
    .where(and(...conditions))
    .orderBy(desc(expenses.date));

  return NextResponse.json(result);
}

export async function POST(req: Request) {
  const userId = await getAuthenticatedUserId();
  if (!userId) return unauthorizedResponse();

  try {
    const body = await req.json();
    const result = expenseInputSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: result.error.flatten() },
        { status: 400 }
      );
    }

    const { amount, description, categoryId, date } = result.data;
    const id = crypto.randomUUID();

    await db.insert(expenses).values({
      id,
      userId,
      categoryId,
      amountCents: amount,
      description,
      date: new Date(date),
      createdAt: new Date(),
    });

    return NextResponse.json({ id }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
