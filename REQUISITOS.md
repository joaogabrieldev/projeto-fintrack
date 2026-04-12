# Requisitos do Projeto FinTrack

## Descrição

FinTrack é um gerenciador de gastos pessoais multi-usuário, desenvolvido como trabalho acadêmico avaliado em: organização, documentação, testes automatizados, linting e CI funcional.

## Stack Obrigatória

- Next.js 16 (App Router, TypeScript strict)
- TailwindCSS
- shadcn/ui (biblioteca de componentes UI)
- SQLite + Drizzle ORM + drizzle-kit
- Auth.js v5 (NextAuth) com Credentials Provider + bcrypt
- Zod para validação (client + server)
- Recharts para gráficos
- Vitest + @testing-library/react para testes
- ESLint + Prettier
- pnpm como package manager

## Requisitos Funcionais

### Autenticação (multi-user)

- Páginas `/login` e `/register` com formulários validados por Zod
- Senha: mín. 8 chars, 1 letra + 1 número, hash com bcrypt cost 10
- Sessão gerenciada por Auth.js (JWT strategy)
- Middleware Next.js protegendo `/dashboard`, `/expenses`, `/settings`
- Isolamento: toda query Drizzle de dados do usuário filtra por `userId = session.user.id`

### Gastos (CRUD)

- Registrar gasto: valor (centavos), descrição, categoria, data
- Listar com filtros: período, categoria, busca textual
- Editar e remover (apenas os próprios)
- Validações Zod: amount > 0, máx R$ 999.999,99; description 1-200 chars; date limites

### Categorias

- CRUD de categorias personalizadas (nome, cor hex, ícone lucide)
- Seed inicial: Alimentação, Transporte, Lazer, Saúde, Moradia, Outros
- Ao deletar categoria com gastos, reatribuir para "Sem categoria"

### Orçamentos

- Orçamento mensal por categoria (centavos, month, year, categoryId)
- Indicador visual: verde (<70%), amarelo (70-99%), vermelho (≥100%)

### Metas de Economia

- Meta mensal: valor alvo de economia
- Progresso = (orçamento total - gastos totais) vs meta

### Dashboard

- Cards: total do mês, total da semana, número de transações
- Gráfico de pizza: gastos por categoria
- Gráfico de linha: gastos diários (30 dias)
- Lista dos 5 gastos mais recentes
- Barras de progresso de orçamentos
- Empty state elegante

### Exportação

- CSV e JSON client-side
- Incluir: data, descrição, categoria, valor formatado

## Testes (Mínimo 8)

1. `centsToReais` formata corretamente
2. `reaisToCents` rejeita negativos
3. `reaisToCents` limite máximo
4. `calculateBudgetUsage` status correto
5. `calculateBudgetUsage` orçamento zero
6. `aggregateByCategory` soma correta
7. `aggregateByDay` tamanho correto
8. `validateExpenseInput` rejeita data futura

## Critérios de Aceitação

- [x] `pnpm install && pnpm db:push && pnpm dev` inicia sem erros
- [x] `pnpm lint` passa sem warnings
- [x] `pnpm test` — todos os 9 testes passam
- [x] `pnpm typecheck` sem erros
- [x] `pnpm build` sem erros
- [x] shadcn/ui instalada e usada consistentemente
- [x] Dark mode funcional
- [x] Isolamento por userId em toda query
- [x] Dashboard com dados e empty state
- [x] Workflow CI configurado
- [x] README documenta shadcn/ui como biblioteca escolhida
- [x] Valores monetários em centavos no banco
- [x] Toda query filtra por userId
