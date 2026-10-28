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

| Camada          | Tecnologia                                            |
| --------------- | ----------------------------------------------------- |
| Framework       | Next.js 16 (App Router, TypeScript strict)            |
| Estilização     | Tailwind CSS 4                                        |
| Componentes UI  | **shadcn/ui** (Radix UI primitives)                   |
| Banco de Dados  | SQLite + Drizzle ORM                                  |
| Autenticação    | Auth.js v5 (NextAuth) — JWT strategy                  |
| Validação       | Zod v4                                                |
| Gráficos        | Recharts                                              |
| Testes          | Vitest + Testing Library                              |
| Linting         | ESLint (next/core-web-vitals + typescript) + Prettier |
| Package Manager | pnpm                                                  |

- Porque eu escolhi o SQLite ao invés de um banco em PostgreSQL?

  O SQLite tem como uma das características principais ser um banco de dados embutido e não cliente-servidor, logo deixa a arquitetura da aplicação muito mais simples, rápida e barata, eliminando a dor de cabeça de configurar e manter um servidor dedicado rodando 24 horas por dia. Como os dados ficam armazenados em um único arquivo local colado na aplicação, a latência de rede é reduzida a zero, o que garante uma velocidade absurda no desenvolvimento.

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
# Edite o .env e defina AUTH_SECRET (gere com: npx auth secret)

# 4. Crie o banco de dados
mkdir -p data
pnpm db:push

# 5. Inicie o servidor de desenvolvimento
pnpm dev
```

Acesse [http://localhost:3000](http://localhost:3000) para usar a aplicação.

## Scripts Disponíveis

| Comando          | Descrição                    |
| ---------------- | ---------------------------- |
| `pnpm dev`       | Servidor de desenvolvimento  |
| `pnpm build`     | Build de produção            |
| `pnpm start`     | Iniciar servidor de produção |
| `pnpm test`      | Rodar testes unitários       |
| `pnpm lint`      | Verificar linting            |
| `pnpm lint:fix`  | Corrigir problemas de lint   |
| `pnpm format`    | Formatar código com Prettier |
| `pnpm typecheck` | Verificar tipos TypeScript   |
| `pnpm db:push`   | Aplicar schema no banco      |
| `pnpm db:studio` | Abrir Drizzle Studio         |

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

<div align="center">

### João Gabriel R. Rocha

**Fullstack Developer**

[![GitHub](https://img.shields.io/badge/GitHub-joaogabrieldev-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/joaogabrieldev)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-João_Gabriel-0077B5?style=for-the-badge&logo=linkedin&logoColor=white)](https://linkedin.com/in/joaogabrielrocha)

</div>

---

## Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## Cenários de teste

Os cenários abaixo descrevem o fluxo principal de uso do FinTrack e serão utilizados como referência para os testes automatizados e para o processo de CI/CD.

### Caminho feliz: cadastrar usuário, fazer login e registrar gasto

**Objetivo:** validar que um usuário consegue criar uma conta, acessar o sistema e registrar uma despesa.

**Pré-condições:**

- A aplicação está em execução em `http://localhost:3000`.
- O banco de dados foi configurado.
- O usuário ainda não possui uma conta com o e-mail utilizado.

**Passos:**

1. Acessar `http://localhost:3000/register`.
2. Informar um nome válido.
3. Informar um e-mail válido, por exemplo `teste@exemplo.com`.
4. Informar uma senha válida.
5. Confirmar o cadastro.
6. Acessar a tela de login.
7. Informar o mesmo e-mail e senha.
8. Confirmar o login.
9. Acessar o dashboard.
10. Cadastrar uma despesa com descrição, valor, categoria e data válidos.
11. Salvar a despesa.
12. Verificar se a despesa aparece na lista e no resumo do dashboard.

**Resultado esperado:**

- O usuário é cadastrado com sucesso.
- O login é realizado.
- O dashboard é exibido.
- A despesa é salva.
- A despesa aparece na listagem e nos valores do dashboard.

### Caminho triste: tentar cadastrar dados inválidos

**Objetivo:** validar que o sistema rejeita informações inválidas e não salva dados incorretos.

**Passos:**

1. Acessar a tela de cadastro.
2. Informar um e-mail inválido ou uma senha menor que o mínimo exigido.
3. Tentar concluir o cadastro.
4. Verificar a mensagem de validação.
5. Tentar cadastrar uma despesa com valor negativo, descrição vazia ou data muito futura.

**Resultado esperado:**

- O cadastro inválido é rejeitado.
- Uma mensagem de erro é exibida.
- Nenhum usuário inválido é criado.
- A despesa inválida não é salva.
- O sistema continua funcionando normalmente.




