"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { centsToReais } from "@/lib/business/currency";
import { calculateBudgetUsage } from "@/lib/business/budget";
import axios from "axios";
import api from "@/lib/api/client";
import {
  DollarSign,
  TrendingUp,
  Receipt,
  Wallet,
  PieChart as PieChartIcon,
  BarChart3,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

interface DashboardData {
  monthTotal: number;
  weekTotal: number;
  transactionCount: number;
  byCategory: { categoryId: string | null; total: number }[];
  byCategoryMonth: { categoryId: string | null; total: number }[];
  dailyTotals: { day: string; total: number }[];
  recent: {
    id: string;
    description: string;
    amountCents: number;
    date: number | string;
    categoryId: string | null;
  }[];
  budgets: {
    id: string;
    categoryId: string;
    amountCents: number;
  }[];
  goal: { targetCents: number } | null;
}

interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
}

const CHART_COLORS = ["#10b981", "#3b82f6", "#a855f7", "#f59e0b", "#ef4444", "#6b7280", "#ec4899"];

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [dashRes, catRes] = await Promise.all([
        api.get("/api/dashboard"),
        api.get("/api/categories"),
      ]);

      const dashData = dashRes.data;
      const catData = catRes.data;
      if (dashData && !dashData.error) setData(dashData);
      setCategories(Array.isArray(catData) ? catData : []);
    } catch (err) {
      if (!axios.isAxiosError(err) || err.response?.status !== 401) {
        console.error("[fetchData dashboard]", err);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Visão geral dos seus gastos</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  const isEmpty =
    !data || (data.monthTotal === 0 && data.transactionCount === 0 && data.recent.length === 0);
  const categoryMap = new Map(categories.map((c) => [c.id, c]));

  const pieData =
    data?.byCategory.map((item) => {
      const cat = categoryMap.get(item.categoryId || "");
      return {
        name: cat?.name || "Sem categoria",
        value: item.total,
        color: cat?.color || "#6b7280",
      };
    }) || [];

  // Build 30-day line chart data
  const lineData: { date: string; total: number }[] = [];
  const dailyMap = new Map((data?.dailyTotals || []).map((d) => [d.day, d.total]));
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    lineData.push({ date: dateStr, total: (dailyMap.get(dateStr) || 0) / 100 });
  }

  // Budget section — uses monthly data so the comparison is accurate
  const budgetSpentMap = new Map(
    (data?.byCategoryMonth || []).map((b) => [b.categoryId, b.total])
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Visão geral dos seus gastos</p>
      </div>

      {isEmpty ? (
        <Card className="py-16">
          <CardContent className="flex flex-col items-center justify-center text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 mb-6">
              <Wallet className="h-10 w-10 text-primary" />
            </div>
            <h2 className="text-2xl font-semibold mb-2">Bem-vindo ao FinTrack!</h2>
            <p className="text-muted-foreground max-w-md">
              Comece adicionando seus primeiros gastos para visualizar estatísticas, gráficos e
              acompanhar seu orçamento mensal.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total do Mês
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{centsToReais(data!.monthTotal)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total da Semana
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{centsToReais(data!.weekTotal)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Transações
                </CardTitle>
                <Receipt className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data!.transactionCount}</div>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Pie Chart */}
            <Card>
              <CardHeader className="flex flex-row items-center gap-2">
                <PieChartIcon className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-base">Gastos por Categoria (30 dias)</CardTitle>
              </CardHeader>
              <CardContent>
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={95}
                        dataKey="value"
                        nameKey="name"
                        stroke="none"
                      >
                        {pieData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.color || CHART_COLORS[index % CHART_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        formatter={(value: any) => centsToReais(Number(value))}
                        contentStyle={{
                          borderRadius: "8px",
                          border: "1px solid hsl(var(--border))",
                          backgroundColor: "hsl(var(--card))",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-muted-foreground py-10">Sem dados</p>
                )}
                <div className="flex flex-wrap gap-3 mt-2">
                  {pieData.map((item, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-xs">
                      <div
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-muted-foreground">{item.name}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Line Chart */}
            <Card>
              <CardHeader className="flex flex-row items-center gap-2">
                <BarChart3 className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-base">Gastos Diários (30 dias)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={lineData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v: string) => {
                        const d = new Date(v + "T12:00:00");
                        return `${d.getDate()}/${d.getMonth() + 1}`;
                      }}
                      interval={4}
                      stroke="hsl(var(--muted-foreground))"
                    />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v: number) => `R$${v.toFixed(0)}`}
                      stroke="hsl(var(--muted-foreground))"
                    />
                    <Tooltip
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      formatter={(value: any) => [`R$ ${Number(value).toFixed(2)}`, "Total"]}
                      contentStyle={{
                        borderRadius: "8px",
                        border: "1px solid hsl(var(--border))",
                        backgroundColor: "hsl(var(--card))",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="total"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2.5}
                      dot={false}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Budgets */}
          {data!.budgets.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Orçamentos do Mês</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {data!.budgets.map((budget) => {
                  const cat = categoryMap.get(budget.categoryId);
                  const spent = budgetSpentMap.get(budget.categoryId) || 0;
                  const usage = calculateBudgetUsage(budget.amountCents, spent);
                  return (
                    <div key={budget.id} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{cat?.name || "Categoria"}</span>
                        <span className="text-muted-foreground">
                          {centsToReais(spent)} / {centsToReais(budget.amountCents)}
                        </span>
                      </div>
                      <Progress
                        value={Math.min(usage.percentage, 100)}
                        indicatorClassName={
                          usage.status === "exceeded"
                            ? "bg-destructive"
                            : usage.status === "warning"
                              ? "bg-warning"
                              : "bg-success"
                        }
                      />
                      <div className="flex justify-end">
                        <Badge
                          variant={
                            usage.status === "exceeded"
                              ? "destructive"
                              : usage.status === "warning"
                                ? "warning"
                                : "success"
                          }
                        >
                          {usage.percentage}%
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* Recent Expenses */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Gastos Recentes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data!.recent.map((expense) => {
                  const cat = categoryMap.get(expense.categoryId || "");
                  return (
                    <div
                      key={expense.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: cat?.color || "#6b7280" }}
                        />
                        <div>
                          <p className="text-sm font-medium">{expense.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {cat?.name || "Sem categoria"} •{" "}
                            {(typeof expense.date === "string" ? new Date(expense.date) : new Date(expense.date * 1000)).toLocaleDateString("pt-BR")}
                          </p>
                        </div>
                      </div>
                      <span className="text-sm font-semibold">
                        {centsToReais(expense.amountCents)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
