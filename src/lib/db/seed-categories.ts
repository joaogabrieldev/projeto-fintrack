import { db } from "@/lib/db";
import { categories } from "@/lib/db/schema";

const DEFAULT_CATEGORIES = [
  { name: "Alimentação", color: "#22c55e", icon: "utensils" },
  { name: "Transporte", color: "#3b82f6", icon: "car" },
  { name: "Lazer", color: "#a855f7", icon: "gamepad-2" },
  { name: "Saúde", color: "#ef4444", icon: "heart-pulse" },
  { name: "Moradia", color: "#f59e0b", icon: "home" },
  { name: "Outros", color: "#6b7280", icon: "ellipsis" },
];

export async function seedCategoriesForUser(userId: string) {
  const values = DEFAULT_CATEGORIES.map((cat) => ({
    id: crypto.randomUUID(),
    userId,
    name: cat.name,
    color: cat.color,
    icon: cat.icon,
  }));

  await db.insert(categories).values(values);
}
