import { z } from "zod/v4";

const MIN_DATE = new Date("2000-01-01");

export const expenseInputSchema = z.object({
  amount: z
    .number()
    .positive("Valor deve ser maior que zero")
    .max(99999999, "Valor máximo é R$ 999.999,99 (em centavos)"),
  description: z
    .string()
    .transform((s) => s.trim())
    .pipe(
      z
        .string()
        .min(1, "Descrição é obrigatória")
        .max(200, "Descrição deve ter no máximo 200 caracteres")
    ),
  categoryId: z.string().nullable(),
  date: z.coerce.date().refine(
    (date) => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(23, 59, 59, 999);
      return date <= tomorrow;
    },
    { message: "Data não pode ser mais de 1 dia no futuro" }
  ).refine(
    (date) => date >= MIN_DATE,
    { message: "Data não pode ser anterior a 2000-01-01" }
  ),
});

export type ExpenseInput = z.infer<typeof expenseInputSchema>;

/**
 * Validates expense input using Zod schema.
 * Returns { success: true, data } or { success: false, errors }.
 */
export function validateExpenseInput(input: unknown) {
  return expenseInputSchema.safeParse(input);
}
