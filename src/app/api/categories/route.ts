import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { categories } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// LISTAR categorias
export async function GET() {
  const allCategories = await db.select().from(categories);
  return NextResponse.json(allCategories);
}

// CRIAR categoria
export async function POST(request: Request) {
  const { name, color, icon } = await request.json();
  const newCategory = await db.insert(categories).values({ name, color, icon }).returning();
  return NextResponse.json(newCategory, { status: 201 });
}

// EDITAR categoria
export async function PUT(request: Request) {
  const { id, name, color, icon } = await request.json();
  const updatedCategory = await db.update(categories).set({ name, color, icon }).where(eq(categories.id, id)).returning();
  return NextResponse.json(updatedCategory);
}

// APAGAR categoria
export async function DELETE(request: Request) {
  const { id } = await request.json();
  await db.delete(categories).where(eq(categories.id, id));
  return NextResponse.json({ message: 'Categoria eliminada' });
}
