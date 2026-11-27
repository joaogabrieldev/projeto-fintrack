# Changelog

Todas as mudanças notáveis deste projeto serão documentadas neste arquivo.

## [Unreleased]

### Added

- Observabilidade: logs estruturados em JSON com `trace_id`, `request_id` e mascaramento de dados sensíveis
- Métricas Prometheus em `/api/metrics` (tráfego, erros, latência, saturação, banco e login), protegidas por `METRICS_TOKEN` em produção
- Traces OpenTelemetry (`@vercel/otel`) com spans automáticos do Next.js e um span por consulta ao banco
- `instrumentRouteHandler`: sinais dourados por rota, 500 genérico sem vazamento e headers `x-request-id`/`x-trace-id`
- `GET /api/health` e `HEALTHCHECK` na imagem Docker
- Stack local em `observability/` (OTel Collector, Prometheus, Grafana, Jaeger, Elasticsearch e Kibana) com painel dos sinais dourados e SLO
- Regras de SLI/SLO, 8 alertas com runbooks e testes das regras com `promtool` no CI
- Documentação em `docs/observabilidade.md` e modelo de post-mortem em `docs/modelo-postmortem.md`
- Testes da instrumentação e do Cenário 9 (erro interno sem expor detalhes técnicos)
- `Dockerfile` multi-stage com Next.js `output: "standalone"` e usuário sem privilégios
- Workflow `docker.yml` que publica a imagem no Docker Hub (`main`, `develop` e tags `v*`)
- Documentação de Docker em `docs/docker.md`

### Changed

- Rotas da API passam pelo `instrumentRouteHandler`; os `try/catch` repetidos que montavam o 500 foram centralizados nele
- CI e documentação passam a exigir Node.js 22 (o Node 20 saiu de suporte e o `@prometheus-io/client` exige 22+)

### Removed

- `Dockerfile.txt` e `nginx.conf`, que serviam um build estático (React) incompatível com o Next.js do projeto

## [1.0.0] - 2026-04-11

### Added

- Autenticação multi-usuário com Auth.js v5 (Credentials Provider + bcrypt)
- CRUD de gastos com validação Zod (valores em centavos)
- CRUD de categorias personalizadas (nome, cor hex, ícone Lucide)
- Seed automático de 6 categorias padrão no registro do usuário
- Orçamentos mensais por categoria com indicadores visuais (verde/amarelo/vermelho)
- Metas de economia mensais
- Dashboard com cards de resumo, gráfico de pizza (gastos por categoria) e gráfico de linha (últimos 30 dias)
- Exportação de dados em CSV e JSON (client-side)
- Dark mode com toggle no header
- Layout responsivo mobile-first
- Pipeline CI com GitHub Actions (typecheck, lint, test, build)
- Testes unitários com Vitest (9 testes cobrindo lógica de negócio)
- ESLint + Prettier configurados
- UI construída com shadcn/ui + Tailwind CSS
- SQLite + Drizzle ORM para persistência
