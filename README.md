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
- **Observabilidade** — logs estruturados, métricas Prometheus, traces OpenTelemetry, painel Grafana, SLO e alertas testados

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
| Observabilidade | OpenTelemetry, Prometheus, Grafana, Elastic Stack, Jaeger |

- Porque eu escolhi o SQLite ao invés de um banco em PostgreSQL?

  O SQLite tem como uma das características principais ser um banco de dados embutido e não cliente-servidor, logo deixa a arquitetura da aplicação muito mais simples, rápida e barata, eliminando a dor de cabeça de configurar e manter um servidor dedicado rodando 24 horas por dia. Como os dados ficam armazenados em um único arquivo local colado na aplicação, a latência de rede é reduzida a zero, o que garante uma velocidade absurda no desenvolvimento.

## Instalação

### Pré-requisitos

- Node.js 22+
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

### Docker

A imagem é publicada no Docker Hub pelo workflow `.github/workflows/docker.yml` a cada push na `main`, na `develop` e em tags `v*`.

```bash
docker run -d -p 3000:3000 --env-file .env <usuario-dockerhub>/fintrack:latest
```

Configuração dos secrets, tags publicadas e uso com SQLite local: [docs/docker.md](docs/docker.md).

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
| `pnpm observability:up` | Subir a stack de observabilidade (Docker) |
| `pnpm observability:down` | Derrubar a stack de observabilidade |
| `pnpm observability:traffic` | Gerar tráfego de demonstração |
| `pnpm observability:test-rules` | Testar as regras de alerta (promtool) |

## Testes

```bash
pnpm test
```

Os testes unitários cobrem a lógica de negócio pura:

- Formatação de moeda (centavos ↔ reais)
- Cálculo de uso de orçamento
- Agregação por categoria e por dia
- Validação de input de gastos

### Teste de API — `POST /api/expenses`

Além dos testes de negócio, há um cenário de API implementado em código em
`tests/api/expenses.route.test.ts`. Ele chama diretamente o Route Handler
`POST` de `src/app/api/expenses/route.ts` (com a autenticação e o banco de
dados substituídos por mocks) e cobre:

- **Sucesso:** dados válidos → `201 Created` com o `id` da despesa (Cenário 3).
- **Erro:** dados inválidos → `400 Bad Request` com `{ error: "Dados inválidos" }`,
  sem persistir nada (Cenário 4).
- **Autorização:** sem usuário autenticado → `401 Não autorizado` (base do Cenário 5).
- **Erro interno:** falha simulada no banco em `GET /api/expenses` → `500` com
  `{ error: "Erro interno do servidor" }`, sem stack trace, tabela ou caminho (Cenário 9).

## Observabilidade

A aplicação emite os três sinais clássicos de telemetria:

- **Métricas** em `/api/metrics` (formato Prometheus): tráfego, erros, latência e saturação por rota, duração das consultas ao banco e tentativas de login.
- **Logs estruturados** em JSON, com `trace_id`, `request_id` e mascaramento automático de senhas, tokens, e-mails e chaves Pix.
- **Traces** com OpenTelemetry: cada requisição mostra o tempo gasto na rota e em cada consulta ao banco.

Toda resposta da API traz `x-request-id` e `x-trace-id` para correlacionar um erro relatado com o log e o trace. O `/api/health` verifica a aplicação e o banco.

Para ver tudo funcionando localmente (Prometheus, Grafana, Jaeger, Elasticsearch e Kibana):

```bash
pnpm observability:up
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318 pnpm dev
pnpm observability:traffic
```

O painel fica em [http://localhost:3001](http://localhost:3001). Arquitetura, catálogo de métricas, SLI/SLO, alertas e runbooks: [docs/observabilidade.md](docs/observabilidade.md).

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

---

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

---

## Cenários de testes das APIs

Os cenários abaixo descrevem os testes que serão utilizados para validar as APIs do FinTrack e dar continuidade à automação do pipeline de CI/CD.

Além do código de status HTTP, deve ser verificado o conteúdo da resposta retornada pela API.

### Pré-condições gerais

- A aplicação deve estar em execução.
- O banco de dados deve estar configurado.
- Os cenários que utilizam despesas devem ser executados com um usuário autenticado.
- Os testes de erro interno devem utilizar um ambiente de testes controlado.
- Nenhuma resposta de erro deve expor stack trace, credenciais, caminhos internos ou detalhes técnicos do banco de dados.

---

### Cenário 1 — Cadastro de usuário com sucesso

**Objetivo:** verificar se a API cria um novo usuário quando recebe dados válidos.

- **Endpoint:** `/api/register`
- **Método HTTP:** `POST`
- **Dados enviados:**

```json
{
  "name": "Usuário de Teste",
  "email": "usuario.teste@example.com",
  "password": "Senha123!"
}
```

- **Status esperado:** `201 Created`
- **Resposta esperada:**

```json
{
  "message": "Usuário criado com sucesso"
}
```

Também deve ser verificado que a senha não seja retornada na resposta.

---

### Cenário 2 — Consulta de despesas com sucesso

**Objetivo:** verificar se a API retorna as despesas pertencentes ao usuário autenticado.

- **Endpoint:** `/api/expenses`
- **Método HTTP:** `GET`
- **Dados enviados:** nenhum corpo obrigatório.
- **Status esperado:** `200 OK`
- **Resposta esperada:** uma lista JSON com as despesas do usuário autenticado.

Exemplo:

```json
[
  {
    "id": "id-da-despesa",
    "userId": "id-do-usuario",
    "categoryId": null,
    "amountCents": 15000,
    "description": "Compra no mercado",
    "date": "2026-10-28T12:00:00.000Z",
    "createdAt": "2026-10-28T12:00:00.000Z"
  }
]
```

A API não deve retornar despesas pertencentes a outros usuários.

---

### Cenário 3 — Cadastro de despesa com sucesso

**Objetivo:** verificar se a API cria uma despesa quando recebe dados válidos.

- **Endpoint:** `/api/expenses`
- **Método HTTP:** `POST`
- **Dados enviados:**

```json
{
  "amount": 15000,
  "description": "Compra no mercado",
  "categoryId": null,
  "date": "2026-10-28T12:00:00.000Z"
}
```

O campo `amount` deve ser enviado em centavos. Nesse exemplo, `15000` representa R$ 150,00.

- **Status esperado:** `201 Created`
- **Resposta esperada:**

```json
{
  "id": "id-gerado-pela-api"
}
```

Também deve ser verificado que a despesa foi realmente salva para o usuário autenticado.

> ✅ **Implementado em código** em `tests/api/expenses.route.test.ts`.

---

### Cenário 4 — Cadastro de despesa com requisição inválida

**Objetivo:** verificar se a API rejeita dados inválidos.

- **Endpoint:** `/api/expenses`
- **Método HTTP:** `POST`
- **Dados enviados:**

```json
{
  "amount": -100,
  "description": "",
  "categoryId": null,
  "date": "data-invalida"
}
```

- **Status esperado:** `400 Bad Request`
- **Resposta esperada:**

```json
{
  "error": "Dados inválidos",
  "details": {}
}
```

O campo `details` deve conter as informações de validação retornadas pelo schema. A despesa não deve ser criada.

> ✅ **Implementado em código** em `tests/api/expenses.route.test.ts`.

Também devem ser testados os seguintes dados inválidos:

- valor igual a zero;
- valor negativo;
- valor acima do limite permitido;
- descrição vazia;
- descrição com mais de 200 caracteres;
- data inválida;
- data com mais de um dia no futuro;
- data anterior a `01/01/2000`;
- ausência de campo obrigatório.

---

### Cenário 5 — Consulta de despesas sem autenticação

**Objetivo:** verificar se a API impede o acesso de usuários não autenticados.

- **Endpoint:** `/api/expenses`
- **Método HTTP:** `GET`
- **Dados enviados:** nenhum.
- **Condição:** executar a requisição sem sessão autenticada.
- **Status esperado:** `401 Unauthorized`
- **Resposta esperada:**

```json
{
  "error": "Não autorizado"
}
```

A API não deve retornar nenhuma despesa.

---

### Cenário 6 — Atualização de despesa com sucesso

**Objetivo:** verificar se uma despesa existente pode ser atualizada pelo usuário proprietário.

- **Endpoint:** `/api/expenses/:id`
- **Método HTTP:** `PUT`
- **Dados enviados:**

```json
{
  "amount": 18000,
  "description": "Compra no mercado atualizada",
  "categoryId": null,
  "date": "2026-10-28T12:00:00.000Z"
}
```

- **Status esperado:** `200 OK`
- **Resposta esperada:**

```json
{
  "success": true
}
```

A API deve atualizar somente uma despesa pertencente ao usuário autenticado.

---

### Cenário 7 — Exclusão de despesa com sucesso

**Objetivo:** verificar se uma despesa existente pode ser removida pelo usuário proprietário.

- **Endpoint:** `/api/expenses/:id`
- **Método HTTP:** `DELETE`
- **Dados enviados:** nenhum corpo obrigatório.
- **Status esperado:** `200 OK`
- **Resposta esperada:**

```json
{
  "success": true
}
```

Depois da operação, a despesa não deve mais aparecer na consulta do usuário.

---

### Cenário 8 — Despesa não encontrada

**Objetivo:** verificar o comportamento quando o usuário tenta alterar ou excluir uma despesa inexistente ou que pertence a outro usuário.

- **Endpoint:** `/api/expenses/:id`
- **Método HTTP:** `DELETE`
- **Dados enviados:** nenhum corpo obrigatório.
- **Status esperado:** `404 Not Found`
- **Resposta esperada:**

```json
{
  "error": "Gasto não encontrado"
}
```

A API não deve alterar ou excluir nenhum registro indevidamente.

O mesmo comportamento deve ser validado no método `PUT`.

---

### Cenário 9 — Erro interno controlado

**Objetivo:** verificar se a API trata uma falha interna sem expor detalhes técnicos.

- **Endpoint:** `/api/expenses`
- **Método HTTP:** `GET`
- **Dados enviados:** nenhum.
- **Condição do teste:** simular uma falha controlada no acesso ao banco de dados no ambiente de testes.
- **Status esperado:** `500 Internal Server Error`
- **Resposta esperada em ambiente de teste ou produção:**

```json
{
  "error": "Erro interno do servidor"
}
```

A resposta não deve expor:

- stack trace;
- nome de tabela;
- caminho de arquivo;
- credenciais;
- token;
- detalhes internos do banco;
- mensagem técnica da exceção.

Esse cenário deve ser executado somente com uma falha simulada e controlada. Não é necessário provocar uma falha real no ambiente de produção.

> ✅ **Implementado em código** em `tests/api/expenses.route.test.ts`. O tratamento do 500 fica centralizado em `instrumentRouteHandler` (`src/lib/observability/instrument-route-handler.ts`), que vale para todas as rotas da API.

---

### Critérios de aceitação

A documentação será considerada válida quando cada cenário informar:

- endpoint;
- método HTTP;
- dados enviados;
- condição do teste;
- status esperado;
- conteúdo esperado da resposta.

Também devem ser verificados:

- o corpo da resposta, além do código HTTP;
- a criação correta dos recursos;
- a rejeição de dados inválidos;
- o isolamento dos dados entre usuários;
- a ausência de informações técnicas nas respostas de erro interno.

> Observação: a rota de alteração de despesa utiliza `PUT /api/expenses/:id`, e não `PATCH`.


