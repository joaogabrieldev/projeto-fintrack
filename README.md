# FinTrack — Gerenciador de Gastos Pessoais 

## O Problema

Muitas pessoas no Brasil não têm controle sobre seus gastos mensais, levando a endividamento e estresse financeiro. Pesquisas do SPC mostram que mais de 60% dos brasileiros não fazem controle detalhado de despesas. A falta de visibilidade sobre para onde o dinheiro vai impede o planejamento financeiro e a construção de uma reserva de emergência.

## A Solução

O **FinTrack** é uma aplicação web multi-usuário que permite registrar, categorizar, orçar e visualizar gastos pessoais com gráficos claros e alertas de limite. Cada usuário tem sua própria conta com dados completamente isolados, podendo acompanhar seus gastos diários, definir orçamentos por categoria e estabelecer metas de economia mensal.

## Público-Alvo

Jovens adultos e famílias que querem organizar finanças pessoais de forma simples, visual e acessível.

## Funcionalidades Principais

- **Autenticação multi-usuário** — registro e login com senhas seguras (bcrypt)
- **CRUD de gastos** — registrar, listar com filtros, editar e remover gastos
- **Categorias personalizadas** — criar, editar e remover categorias com cor e ícone
- **Orçamentos mensais** — definir limites por categoria com indicadores visuais (verde/amarelo/vermelho)
- **Metas de economia** — acompanhar progresso mensal
- **Dashboard interativo** — cards de resumo, gráfico de pizza por categoria, gráfico de linha temporal (30 dias), gastos recentes
- **Exportação** — download de dados em CSV e JSON
- **Dark mode** — toggle no header, respeita preferência do sistema
- **Responsivo** — layout mobile-first que funciona em qualquer dispositivo

## Stack Tecnológica

| Camada | Tecnologia |
|--------|-----------|
| Framework | Next.js 16 (App Router, TypeScript strict) |
| Estilização | Tailwind CSS 4 |
| Componentes UI | **shadcn/ui** (Radix UI primitives) |
| Banco de Dados | SQLite + Drizzle ORM |
| Autenticação | Auth.js v5 (NextAuth) — JWT strategy |
| Validação | Zod v4 |
| Gráficos | Recharts |
| Testes | Vitest + Testing Library |
| Linting | ESLint (next/core-web-vitals + typescript) + Prettier |
| Package Manager | pnpm |

- Porque eu escolhi o SQLite ao invés de um banco em PostgreSQL?

  O SQLite tem como uma das características principais ser um banco de dados embutido e não cliente-servidor, logo deixa  

## Instalação

### Pré-requisitos

- Node.js 20+
- pnpm 9+

### Passo a passo

```bash
# 1. Clone o repositório
git clone <url-do-repositorio>
cd fintrack

# 2. Instale as dependências
pnpm install

# 3. Configure o ambiente
cp .env.example .env
# Edite o .env e defina AUTH_SECRET (gere com: openssl rand -base64 32)

# 4. Crie o banco de dados
mkdir -p data
pnpm db:push

# 5. Inicie o servidor de desenvolvimento
pnpm dev
```

Acesse [http://localhost:3000](http://localhost:3000) para usar a aplicação.

## Scripts Disponíveis

| Comando | Descrição |
|---------|-----------|
| `pnpm dev` | Servidor de desenvolvimento |
| `pnpm build` | Build de produção |
| `pnpm start` | Iniciar servidor de produção |
| `pnpm test` | Rodar testes unitários |
| `pnpm lint` | Verificar linting |
| `pnpm lint:fix` | Corrigir problemas de lint |
| `pnpm format` | Formatar código com Prettier |
| `pnpm typecheck` | Verificar tipos TypeScript |
| `pnpm db:push` | Aplicar schema no banco |
| `pnpm db:studio` | Abrir Drizzle Studio |

## Testes

```bash
pnpm test
```

Os testes unitários cobrem a lógica de negócio pura:
- Formatação de moeda (centavos ↔ reais)
- Cálculo de uso de orçamento
- Agregação por categoria e por dia
- Validação de input de gastos

## Lint

```bash
pnpm lint
```

## Versão

**1.0.0 (MVP)** 

## Autor

João Gabriel R. Rocha

## Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.
