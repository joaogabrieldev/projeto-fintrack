/**
 * Converts cents (integer) to a formatted BRL string.
 * Example: 123456 → "R$ 1.234,56"
 */
export function centsToReais(cents: number): string {
  const reais = cents / 100;
  return reais.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

/**
 * Converts a reais value (string or number) to cents (integer).
 * Validates range: must be > 0 and <= 999999.99
 * Throws on invalid input.
 */
export function reaisToCents(reais: string | number): number {
  let value: number;

  if (typeof reais === "string") {
    // Handle BR format: "1.234,56" → 1234.56
    const cleaned = reais.replace(/[R$\s]/g, "").replace(/\./g, "").replace(",", ".");
    value = parseFloat(cleaned);
  } else {
    value = reais;
  }

  if (isNaN(value)) {
    throw new Error("Valor inválido");
  }

  if (value < 0) {
    throw new Error("Valor não pode ser negativo");
  }

  if (value > 999999.99) {
    throw new Error("Valor máximo é R$ 999.999,99");
  }

  return Math.round(value * 100);
}
