import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { categories } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { auth } from '@/auth'; // Importamos a autenticação

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  // Agora filtramos apenas as categorias do utilizador logado!
  const allCategories = await db.select().from(categories).where(eq(categories.userId, session.user.id));
  return NextResponse.json(allCategories);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { name, color, icon } = await request.json();
  const newCategory = await db.insert(categories).values({ 
    name, 
    color, 
    icon, 
    userId: session.user.id // Associamos ao utilizador
  }).returning();
  
  return NextResponse.json(newCategory, { status: 201 });
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { id, name, color, icon } = await request.json();
  const updatedCategory = await db.update(categories)
    .set({ name, color, icon })
    .where(and(eq(categories.id, id), eq(categories.userId, session.user.id))) // Só edita se for dele
    .returning();
    
  return NextResponse.json(updatedCategory);
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { id } = await request.json();
  await db.delete(categories)
    .where(and(eq(categories.id, id), eq(categories.userId, session.user.id))); // Só apaga se for dele
    
  return NextResponse.json({ message: 'Categoria eliminada' });
}
