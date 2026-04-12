import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { goals } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getAuthenticatedUserId, unauthorizedResponse } from "@/lib/auth/session";
import { z } from "zod/v4";

const goalSchema = z.object({
  targetCents: z.number().int().positive().max(99999999),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100),
});

export async function GET(req: NextRequest) {
  const userId = await getAuthenticatedUserId();
  if (!userId) return unauthorizedResponse();

  const { searchParams } = req.nextUrl;
  const month = parseInt(searchParams.get("month") || String(new Date().getMonth() + 1));
  const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()));

  const result = await db.query.goals.findFirst({
    where: and(eq(goals.userId, userId), eq(goals.month, month), eq(goals.year, year)),
  });

  return NextResponse.json(result || null);
}

export async function POST(req: Request) {
  const userId = await getAuthenticatedUserId();
  if (!userId) return unauthorizedResponse();

  try {
    const body = await req.json();
    const result = goalSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: result.error.flatten() },
        { status: 400 }
      );
    }

    const { targetCents, month, year } = result.data;

    const existing = await db.query.goals.findFirst({
      where: and(eq(goals.userId, userId), eq(goals.month, month), eq(goals.year, year)),
    });

    if (existing) {
      await db.update(goals).set({ targetCents }).where(eq(goals.id, existing.id));
      return NextResponse.json({ id: existing.id });
    }

    const id = crypto.randomUUID();
    await db.insert(goals).values({ id, userId, targetCents, month, year });

    return NextResponse.json({ id }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
