import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { categories } from "@/lib/db/schema";
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

  const result = await db.select().from(categories).where(eq(categories.userId, userId));

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
  } catch {
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
