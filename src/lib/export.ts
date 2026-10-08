import { type Expense } from "./db/schema";

// Função 1: Exportar qualquer dado para JSON
export const exportToJSON = <T>(data: T[], filename: string) => {
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Função 2: Exportar qualquer dado para CSV com tratamento de textos e datas
export const exportToCSV = <T extends Record<string, unknown>>(data: T[], filename: string) => {
  if (!data || data.length === 0) return;

  const headers = Object.keys(data[0]);
  
  const rows = data.map(row => {
    return headers.map(header => {
      let value = row[header];
      
      // Formata objetos Date para YYYY-MM-DD
      if (value instanceof Date) {
        value = value.toISOString().split('T')[0];
      }
      
      // Coloca textos entre aspas para evitar quebra de colunas caso haja vírgulas na descrição
      if (typeof value === "string") {
        return `"${value.replace(/"/g, '""')}"`;
      }
      
      return value;
    }).join(",");
  });

  const csvContent = `${headers.join(",")}\n${rows.join("\n")}`;
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Função Auxiliar: Formatar as despesas antes de exportar (converte centavos e traduz cabeçalhos)
export const formatExpensesForExport = (expenses: Expense[]) => {
  return expenses.map(exp => ({
    "ID da Despesa": exp.id,
    "Data": exp.date instanceof Date ? exp.date.toLocaleDateString('pt-BR') : exp.date,
    "Descrição": exp.description,
    "Valor (R$)": (exp.amountCents / 100).toFixed(2), // Transformando os centavos em Reais
    "ID da Categoria": exp.categoryId || "Sem categoria",
  }));
};