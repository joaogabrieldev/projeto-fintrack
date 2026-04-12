import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { categories, expenses } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getAuthenticatedUserId, unauthorizedResponse } from "@/lib/auth/session";
import { z } from "zod/v4";

const categoryUpdateSchema = z.object({
  name: z.string().min(1).max(50),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  icon: z.string().min(1),
});

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getAuthenticatedUserId();
  if (!userId) return unauthorizedResponse();

  try {
    const { id } = await params;
    const body = await req.json();
    const result = categoryUpdateSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: result.error.flatten() },
        { status: 400 }
      );
    }

    const updated = await db
      .update(categories)
      .set(result.data)
      .where(and(eq(categories.id, id), eq(categories.userId, userId)));

    if (updated.rowsAffected === 0) {
      return NextResponse.json({ error: "Categoria não encontrada" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[PUT /api/categories/:id]", error);
    const message =
      process.env.NODE_ENV === "development"
        ? (error instanceof Error ? error.message : String(error))
        : "Erro interno do servidor";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getAuthenticatedUserId();
  if (!userId) return unauthorizedResponse();

  try {
    const { id } = await params;

    // Reassign expenses to null (uncategorized) before deleting
    await db
      .update(expenses)
      .set({ categoryId: null })
      .where(and(eq(expenses.categoryId, id), eq(expenses.userId, userId)));

    const deleted = await db
      .delete(categories)
      .where(and(eq(categories.id, id), eq(categories.userId, userId)));

    if (deleted.rowsAffected === 0) {
      return NextResponse.json({ error: "Categoria não encontrada" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/categories/:id]", error);
    const message =
      process.env.NODE_ENV === "development"
        ? (error instanceof Error ? error.message : String(error))
        : "Erro interno do servidor";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
