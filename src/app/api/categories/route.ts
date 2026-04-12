import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { categories, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getAuthenticatedUserId, unauthorizedResponse } from "@/lib/auth/session";
import { z } from "zod/v4";

const categorySchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(50),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Cor deve ser hex válida"),
  icon: z.string().min(1, "Ícone é obrigatório"),
});

export async function GET() {
  const userId = await getAuthenticatedUserId();
  if (!userId) return unauthorizedResponse();

  // Check user exists in DB (session JWT may outlive a DB reset)
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!user) {
    return NextResponse.json({ error: "Usuário não encontrado. Faça login novamente." }, { status: 401 });
  }

  let result = await db.select().from(categories).where(eq(categories.userId, userId));

  // Auto-seed default categories if user has none
  if (result.length === 0) {
    const { seedCategoriesForUser } = await import("@/lib/db/seed-categories");
    await seedCategoriesForUser(userId);
    result = await db.select().from(categories).where(eq(categories.userId, userId));
  }

  return NextResponse.json(result);
}

export async function POST(req: Request) {
  const userId = await getAuthenticatedUserId();
  if (!userId) return unauthorizedResponse();

  try {
    const body = await req.json();
    const result = categorySchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: result.error.flatten() },
        { status: 400 }
      );
    }

    const id = crypto.randomUUID();
    await db.insert(categories).values({
      id,
      userId,
      ...result.data,
    });

    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/categories]", error);
    const message =
      process.env.NODE_ENV === "development"
        ? (error instanceof Error ? error.message : String(error))
        : "Erro interno do servidor";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
