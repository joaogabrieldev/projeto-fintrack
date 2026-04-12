import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { registerSchema } from "@/lib/validations/auth";
import { seedCategoriesForUser } from "@/lib/db/seed-categories";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = registerSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: result.error.flatten() },
        { status: 400 }
      );
    }

    const { name, email, password } = result.data;

    const existing = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (existing) {
      return NextResponse.json({ error: "Email já cadastrado" }, { status: 409 });
    }

    const passwordHash = await hash(password, 10);
    const id = crypto.randomUUID();

    await db.insert(users).values({
      id,
      email,
      passwordHash,
      name,
      createdAt: new Date(),
    });

    await seedCategoriesForUser(id);

    return NextResponse.json({ message: "Usuário criado com sucesso" }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
