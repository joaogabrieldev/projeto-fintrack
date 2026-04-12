"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { centsToReais, reaisToCents } from "@/lib/business/currency";
import {
  Plus,
  Pencil,
  Trash2,
  Download,
  Tag,
  Target,
  Loader2,
  PiggyBank,
} from "lucide-react";
import { toast } from "sonner";

interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
}

interface Budget {
  id: string;
  categoryId: string;
  amountCents: number;
  month: number;
  year: number;
  spentCents?: number;
}

interface Goal {
  id: string;
  targetCents: number;
  month: number;
  year: number;
}

export default function SettingsPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [loading, setLoading] = useState(true);

  // Category form
  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [catName, setCatName] = useState("");
  const [catColor, setCatColor] = useState("#22c55e");
  const [catIcon, setCatIcon] = useState("tag");
  const [catSaving, setCatSaving] = useState(false);

  // Budget form
  const [budgetDialogOpen, setBudgetDialogOpen] = useState(false);
  const [budgetCategory, setBudgetCategory] = useState("");
  const [budgetAmount, setBudgetAmount] = useState("");
  const [budgetSaving, setBudgetSaving] = useState(false);

  // Goal form
  const [goalAmount, setGoalAmount] = useState("");
  const [goalSaving, setGoalSaving] = useState(false);

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const fetchData = useCallback(async () => {
    try {
      const [catRes, budgetRes, goalRes] = await Promise.all([
        fetch("/api/categories"),
        fetch(`/api/budgets?month=${currentMonth}&year=${currentYear}`),
        fetch(`/api/goals?month=${currentMonth}&year=${currentYear}`),
      ]);
      setCategories(await catRes.json());
      setBudgets(await budgetRes.json());
      const goalData = await goalRes.json();
      setGoal(goalData);
      if (goalData) setGoalAmount((goalData.targetCents / 100).toString());
    } finally {
      setLoading(false);
    }
  }, [currentMonth, currentYear]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Category handlers
  function openNewCat() {
    setEditingCat(null);
    setCatName("");
    setCatColor("#22c55e");
    setCatIcon("tag");
    setCatDialogOpen(true);
  }

  function openEditCat(cat: Category) {
    setEditingCat(cat);
    setCatName(cat.name);
    setCatColor(cat.color);
    setCatIcon(cat.icon);
    setCatDialogOpen(true);
  }

  async function saveCat() {
    setCatSaving(true);
    try {
      const payload = { name: catName, color: catColor, icon: catIcon };
      const url = editingCat ? `/api/categories/${editingCat.id}` : "/api/categories";
      const method = editingCat ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        toast.error("Erro ao salvar categoria");
        return;
      }
      toast.success(editingCat ? "Categoria atualizada" : "Categoria criada");
      setCatDialogOpen(false);
      fetchData();
    } finally {
      setCatSaving(false);
    }
  }

  async function deleteCat(id: string) {
    if (!confirm("Ao excluir, os gastos desta categoria ficarão 'Sem categoria'. Continuar?"))
      return;
    const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Categoria excluída");
      fetchData();
    } else {
      toast.error("Erro ao excluir");
    }
  }

  // Budget handlers
  function openNewBudget() {
    setBudgetCategory("");
    setBudgetAmount("");
    setBudgetDialogOpen(true);
  }

  async function saveBudget() {
    setBudgetSaving(true);
    try {
      const amountCents = reaisToCents(parseFloat(budgetAmount));
      const res = await fetch("/api/budgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId: budgetCategory,
          amountCents,
          month: currentMonth,
          year: currentYear,
        }),
      });
      if (!res.ok) {
        toast.error("Erro ao salvar orçamento");
        return;
      }
      toast.success("Orçamento definido");
      setBudgetDialogOpen(false);
      fetchData();
    } catch {
      toast.error("Valor inválido");
    } finally {
      setBudgetSaving(false);
    }
  }

  // Goal handler
  async function saveGoal() {
    setGoalSaving(true);
    try {
      const targetCents = reaisToCents(parseFloat(goalAmount));
      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetCents, month: currentMonth, year: currentYear }),
      });
      if (!res.ok) {
        toast.error("Erro ao salvar meta");
        return;
      }
      toast.success("Meta definida");
      fetchData();
    } catch {
      toast.error("Valor inválido");
    } finally {
      setGoalSaving(false);
    }
  }

  // Export handlers
  async function exportCSV() {
    const res = await fetch("/api/expenses");
    const data = await res.json();
    const catMap = new Map(categories.map((c) => [c.id, c.name]));

    const header = "Data,Descrição,Categoria,Valor\n";
    const rows = data
      .map(
        (e: { date: number; description: string; categoryId: string | null; amountCents: number }) =>
          `${new Date(e.date * 1000).toLocaleDateString("pt-BR")},"${e.description}",${catMap.get(e.categoryId || "") || "Sem categoria"},${centsToReais(e.amountCents)}`
      )
      .join("\n");

    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    downloadBlob(blob, "fintrack-gastos.csv");
    toast.success("CSV exportado");
  }

  async function exportJSON() {
    const res = await fetch("/api/expenses");
    const data = await res.json();
    const catMap = new Map(categories.map((c) => [c.id, c.name]));

    const formatted = data.map(
      (e: { date: number; description: string; categoryId: string | null; amountCents: number }) => ({
        data: new Date(e.date * 1000).toLocaleDateString("pt-BR"),
        descricao: e.description,
        categoria: catMap.get(e.categoryId || "") || "Sem categoria",
        valor: centsToReais(e.amountCents),
      })
    );

    const blob = new Blob([JSON.stringify(formatted, null, 2)], { type: "application/json" });
    downloadBlob(blob, "fintrack-gastos.json");
    toast.success("JSON exportado");
  }

  function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground mt-1">
          Gerencie categorias, orçamentos, metas e exporte dados
        </p>
      </div>

      <Tabs defaultValue="categories">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="categories">Categorias</TabsTrigger>
          <TabsTrigger value="budgets">Orçamentos</TabsTrigger>
          <TabsTrigger value="goals">Metas</TabsTrigger>
          <TabsTrigger value="export">Exportar</TabsTrigger>
        </TabsList>

        {/* Categories Tab */}
        <TabsContent value="categories" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <Tag className="h-5 w-5 text-muted-foreground" />
                <div>
                  <CardTitle className="text-base">Categorias</CardTitle>
                  <CardDescription>Organize seus gastos por categoria</CardDescription>
                </div>
              </div>
              <Button size="sm" onClick={openNewCat}>
                <Plus className="mr-2 h-4 w-4" />
                Nova
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {categories.map((cat) => (
                  <div
                    key={cat.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="h-4 w-4 rounded-full"
                        style={{ backgroundColor: cat.color }}
                      />
                      <span className="font-medium text-sm">{cat.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {cat.icon}
                      </Badge>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEditCat(cat)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteCat(cat.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Budgets Tab */}
        <TabsContent value="budgets" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-muted-foreground" />
                <div>
                  <CardTitle className="text-base">
                    Orçamentos — {currentMonth}/{currentYear}
                  </CardTitle>
                  <CardDescription>Defina limites mensais por categoria</CardDescription>
                </div>
              </div>
              <Button size="sm" onClick={openNewBudget}>
                <Plus className="mr-2 h-4 w-4" />
                Novo
              </Button>
            </CardHeader>
            <CardContent>
              {budgets.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum orçamento definido para este mês
                </p>
              ) : (
                <div className="space-y-2">
                  {budgets.map((b) => {
                    const cat = categories.find((c) => c.id === b.categoryId);
                    return (
                      <div key={b.id} className="flex items-center justify-between rounded-lg border p-3">
                        <div>
                          <span className="font-medium text-sm">{cat?.name || "?"}</span>
                          <p className="text-xs text-muted-foreground">
                            {centsToReais(b.amountCents)} / mês
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Goals Tab */}
        <TabsContent value="goals" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <PiggyBank className="h-5 w-5 text-muted-foreground" />
                <div>
                  <CardTitle className="text-base">
                    Meta de Economia — {currentMonth}/{currentYear}
                  </CardTitle>
                  <CardDescription>Quanto você quer economizar este mês?</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3">
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Valor em reais"
                  value={goalAmount}
                  onChange={(e) => setGoalAmount(e.target.value)}
                />
                <Button onClick={saveGoal} disabled={goalSaving}>
                  {goalSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Salvar Meta
                </Button>
              </div>
              {goal && (
                <p className="text-sm text-muted-foreground">
                  Meta atual: {centsToReais(goal.targetCents)}
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Export Tab */}
        <TabsContent value="export" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Download className="h-5 w-5 text-muted-foreground" />
                <div>
                  <CardTitle className="text-base">Exportar Dados</CardTitle>
                  <CardDescription>Baixe seus gastos em CSV ou JSON</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3">
                <Button variant="outline" onClick={exportCSV}>
                  <Download className="mr-2 h-4 w-4" />
                  Exportar CSV
                </Button>
                <Button variant="outline" onClick={exportJSON}>
                  <Download className="mr-2 h-4 w-4" />
                  Exportar JSON
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Category Dialog */}
      <Dialog open={catDialogOpen} onOpenChange={setCatDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCat ? "Editar Categoria" : "Nova Categoria"}</DialogTitle>
            <DialogDescription>
              {editingCat
                ? "Atualize as informações da categoria"
                : "Crie uma nova categoria para organizar seus gastos"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={catName} onChange={(e) => setCatName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Cor</Label>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={catColor}
                  onChange={(e) => setCatColor(e.target.value)}
                  className="h-10 w-14 rounded border cursor-pointer"
                />
                <Input
                  value={catColor}
                  onChange={(e) => setCatColor(e.target.value)}
                  placeholder="#000000"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Ícone (Lucide)</Label>
              <Input
                value={catIcon}
                onChange={(e) => setCatIcon(e.target.value)}
                placeholder="Ex: utensils, car, heart"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCatDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={saveCat} disabled={catSaving}>
              {catSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Budget Dialog */}
      <Dialog open={budgetDialogOpen} onOpenChange={setBudgetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Orçamento</DialogTitle>
            <DialogDescription>
              Defina um limite de gasto mensal para uma categoria
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Categoria</Label>
              <select
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                value={budgetCategory}
                onChange={(e) => setBudgetCategory(e.target.value)}
              >
                <option value="">Selecione...</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Valor (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={budgetAmount}
                onChange={(e) => setBudgetAmount(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBudgetDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={saveBudget} disabled={budgetSaving}>
              {budgetSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Separator />
    </div>
  );
}
