# Observabilidade — FinTrack

Este documento descreve como o FinTrack emite, coleta e usa seus sinais de operação: métricas, logs e traces. Ele aplica ao projeto o conteúdo da aula de SRE e Observabilidade: os três sinais clássicos, os sinais dourados, SLI/SLO/SLA, alertas e o ciclo de melhoria contínua.

> **Monitoramento pergunta "está funcionando?"; observabilidade ajuda a explicar "por quê?".**
> Os alertas deste documento respondem à primeira pergunta. Logs estruturados, traces e a correlação entre eles respondem à segunda.

## 1. Arquitetura

```text
                         ┌──────────────── traces (OTLP) ───────────────► Jaeger ─────────┐
                         │                                                                │
  FinTrack (Next.js) ────┼──► OTel Collector ──── logs (OTLP) ──► Elasticsearch ──► Kibana │
  SDK OTel + logger      │   (receiver → processor → exporter)          │                 │
                         │                                              ▼                 ▼
                         └──── /api/metrics ◄── scrape ── Prometheus ──────────────► Grafana
                                                         (regras e alertas)   (painel, logs e traces)
```

| Ferramenta                  | Papel no FinTrack                                                                                    |
| --------------------------- | ---------------------------------------------------------------------------------------------------- |
| **OpenTelemetry (SDK)**     | Instrumenta a aplicação: spans automáticos do Next.js, spans do banco e envio de logs via OTLP.      |
| **OpenTelemetry Collector** | Recebe os sinais, remove dados sensíveis, agrupa em lote e envia para cada backend.                  |
| **Prometheus**              | Coleta `/api/metrics` a cada 15 s, guarda as séries temporais e avalia as regras de SLI e de alerta. |
| **Grafana**                 | Painel dos sinais dourados e do SLO, com links log → trace e trace → logs.                           |
| **Elastic Stack**           | Elasticsearch indexa os logs estruturados; Kibana permite buscar e filtrar.                          |
| **Jaeger**                  | Armazena e mostra os traces: por onde a requisição passou e onde demorou.                            |

O OpenTelemetry não é banco de dados nem painel: ele padroniza a instrumentação e o transporte. Trocar o Jaeger pelo Tempo, ou o Elasticsearch por outro backend, muda só o exporter no collector, não o código da aplicação.

### Onde está cada parte

| Caminho                                               | Conteúdo                                                       |
| ----------------------------------------------------- | -------------------------------------------------------------- |
| `src/instrumentation.ts`                              | Registro do OpenTelemetry e captura de erros do Next.js        |
| `src/lib/observability/logger.ts`                     | Logger JSON com níveis, mascaramento e `trace_id`              |
| `src/lib/observability/metrics.ts`                    | Definição das métricas (counter, gauge, histogram)             |
| `src/lib/observability/instrument-route-handler.ts`   | Sinais dourados por rota, 500 genérico e headers de correlação |
| `src/lib/observability/instrument-database-client.ts` | Span, duração e log de lentidão de cada consulta ao banco      |
| `src/app/api/metrics/route.ts`                        | Endpoint de scraping do Prometheus                             |
| `src/app/api/health/route.ts`                         | Verificação de saúde (usada pelo `HEALTHCHECK` do Docker)      |
| `observability/`                                      | Stack local: compose, collector, Prometheus, Grafana           |

## 2. Como rodar localmente

Pré-requisitos: Docker com cerca de 4 GB de memória livre (Elasticsearch e Kibana são os maiores) e o projeto já configurado conforme o README.

1. Suba a stack:

   ```bash
   pnpm observability:up
   ```

2. Inicie a aplicação enviando telemetria para o collector (ou coloque a variável no `.env`):

   ```bash
   OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318 pnpm dev
   ```

3. Gere tráfego de demonstração. O script cria um usuário de teste, registra gastos e provoca de propósito alguns 400, 404, falhas de login e um 500:

   ```bash
   pnpm observability:traffic
   ```

4. Abra as interfaces:

   | Interface  | Endereço                           | Observação                                                                          |
   | ---------- | ---------------------------------- | ----------------------------------------------------------------------------------- |
   | Grafana    | http://localhost:3001              | Painel "FinTrack - Sinais dourados e SLO". O Explore exige login (`admin`/`admin`). |
   | Prometheus | http://localhost:9090/alerts       | Estado de cada alerta                                                               |
   | Jaeger     | http://localhost:16686             | Serviço `fintrack`                                                                  |
   | Kibana     | http://localhost:5601/app/discover | Data view "FinTrack logs"                                                           |
   | Métricas   | http://localhost:3000/api/metrics  | Texto no formato do Prometheus                                                      |
   | Saúde      | http://localhost:3000/api/health   | `200` com banco ok, `503` sem banco                                                 |

5. Para derrubar a stack (os dados ficam nos volumes): `pnpm observability:down`.

## 3. Os três sinais no código

Os sinais são complementares; nenhum responde sozinho a todas as perguntas.

| Sinal    | Pergunta que responde       | Onde ver             |
| -------- | --------------------------- | -------------------- |
| Métricas | Quanto? Com que frequência? | Prometheus e Grafana |
| Logs     | O que aconteceu?            | Kibana e Grafana     |
| Traces   | Onde ocorreu a demora?      | Jaeger e Grafana     |

### 3.1 Métricas

As métricas ficam em `/api/metrics`, no formato texto do Prometheus.

| Métrica                         | Tipo      | Labels                      | O que mede                                                       |
| ------------------------------- | --------- | --------------------------- | ---------------------------------------------------------------- |
| `http_requests_total`           | Counter   | `method`, `route`, `status` | Tráfego e erros da API                                           |
| `http_request_duration_seconds` | Histogram | `method`, `route`, `status` | Latência; permite estimar p50, p95 e p99                         |
| `http_requests_in_flight`       | Gauge     | `method`, `route`           | Requisições em andamento (saturação)                             |
| `db_query_duration_seconds`     | Histogram | `operation`, `table`        | Duração das consultas ao banco                                   |
| `db_query_errors_total`         | Counter   | `operation`, `table`        | Consultas que falharam                                           |
| `auth_login_attempts_total`     | Counter   | `result`                    | Logins com `success` ou `invalid_credentials`                    |
| `server_request_errors_total`   | Counter   | `route_type`                | Erros de render, Server Actions e proxy capturados pelo Next.js  |
| `nodejs_*`, `process_*`         | Vários    | —                           | Memória, CPU e atraso do event loop do processo Node (saturação) |

**Cardinalidade controlada.** Toda label tem um conjunto fechado de valores. A rota é sempre o modelo (`/api/expenses/[id]`), nunca o caminho real com o id. Id de usuário, id de despesa, e-mail ou CPF nunca viram label: cada valor distinto criaria uma série temporal nova no Prometheus. Há um teste que garante isso (`tests/unit/observability/instrument-route-handler.test.ts`).

**Acesso em produção.** Sem `METRICS_TOKEN`, o `/api/metrics` responde `404` em produção, para não expor dados de operação publicamente. Com o token definido, o endpoint exige `Authorization: Bearer <token>`. Em desenvolvimento, sem token, o acesso é livre. O endpoint não entra nas próprias métricas, para o scrape não inflar o tráfego.

### 3.2 Logs estruturados

Cada log é uma linha JSON no stdout (lida pelo Docker ou pela Vercel) e, quando `OTEL_EXPORTER_OTLP_ENDPOINT` está definido, também é enviado ao collector e indexado no Elasticsearch.

```json
{
  "timestamp": "2026-11-27T20:15:43.854Z",
  "level": "ERROR",
  "service": "fintrack",
  "event": "http_request_failed",
  "trace_id": "cca6ed3b4986278399b536398905beb2",
  "span_id": "aaddc0280b29485d",
  "method": "POST",
  "route": "/api/expenses",
  "status": 500,
  "duration_ms": 7,
  "request_id": "f5eb814b-8b76-4978-a3ad-83303eb17a59"
}
```

| Nível   | Quando usar                  | Exemplos no FinTrack                                                                    |
| ------- | ---------------------------- | --------------------------------------------------------------------------------------- |
| `DEBUG` | Detalhes de diagnóstico      | (desligado por padrão)                                                                  |
| `INFO`  | Eventos esperados            | `http_request_completed`, `telemetry_started`                                           |
| `WARN`  | Situação anormal recuperável | `db_slow_query`, `auth_login_failed`                                                    |
| `ERROR` | Falha em uma operação        | `http_request_failed`, `db_query_failed`, `health_check_failed`, `server_request_error` |

O nível mínimo vem de `LOG_LEVEL` (padrão `info`; nos testes, `silent`).

**Nunca registrar senhas, tokens, chaves Pix ou dados pessoais desnecessários.** O logger mascara com `[REDACTED]`, em qualquer nível do objeto, chaves que contenham `password`, `secret`, `token`, `authorization`, `cookie`, `credential`, `api_key`, `cpf`, `pix` ou `email`. O collector remove de novo os headers `authorization` e `cookie` dos spans, como segunda barreira. As falhas de login não registram o e-mail digitado.

### 3.3 Traces

Com o OpenTelemetry registrado em `src/instrumentation.ts`, o Next.js cria sozinho o span raiz de cada requisição (`POST /api/expenses`) e o span de execução da rota. O cliente do banco instrumentado acrescenta um span por consulta (`SELECT expenses`, `INSERT expenses`), com a operação, a tabela e o SQL parametrizado, sem os valores.

Exemplo real de `GET /api/dashboard` no Jaeger:

```text
12.49 ms  GET /api/dashboard
 8.86 ms  └─ executing api route (app) /api/dashboard   fintrack.request_id=75efe07f-...
 0.28 ms     ├─ SELECT expenses
 0.15 ms     ├─ SELECT expenses   (x6, uma por agregação do painel)
 0.14 ms     ├─ SELECT budgets
 0.20 ms     └─ SELECT goals
```

### 3.4 Correlação

Toda resposta da API traz dois headers:

- `x-request-id`: id da requisição. Se o cliente ou um proxy enviar um id válido, ele é reaproveitado.
- `x-trace-id`: id do trace no Jaeger.

O mesmo `trace_id` aparece no log da requisição e em todo log emitido durante ela (por exemplo, um `db_slow_query`). Quando um usuário relata um erro, o `x-request-id` da resposta leva ao log, e o `trace_id` do log leva ao trace. No Grafana, o campo `trace_id` de um log abre o trace no Jaeger, e um trace abre os logs dele.

## 4. Sinais dourados e painel

O painel "FinTrack - Sinais dourados e SLO" é provisionado a partir de `observability/grafana/dashboards/fintrack-golden-signals.json`.

| Sinal dourado | Pergunta                         | Consulta base (PromQL)                                                                   |
| ------------- | -------------------------------- | ---------------------------------------------------------------------------------------- |
| Latência      | Quanto tempo a API leva?         | `histogram_quantile(0.95, sum by (le) (rate(http_request_duration_seconds_bucket[5m])))` |
| Tráfego       | Quantas requisições por segundo? | `sum(rate(http_requests_total[5m]))`                                                     |
| Erros         | Quantas falham?                  | `sum(rate(http_requests_total{status=~"5.."}[5m])) / sum(rate(http_requests_total[5m]))` |
| Saturação     | Quão perto do limite?            | `http_requests_in_flight`, `nodejs_eventloop_lag_p99_seconds`, memória do processo       |

O p95 é uma estimativa a partir das faixas do histograma: aproximadamente 95% das requisições ficam até aquele valor.

O painel também mostra a latência do banco por tabela, as tentativas de login, os alertas pendentes e disparando, e os logs `WARN`/`ERROR` vindos do Elasticsearch.

## 5. SLI, SLO e error budget

| Indicador (SLI)                                           | Objetivo (SLO) | Janela  | Série no Prometheus                   |
| --------------------------------------------------------- | -------------- | ------- | ------------------------------------- |
| Proporção de requisições da API sem erro 5xx              | 99,5%          | 30 dias | `fintrack:availability_sli:ratio_30d` |
| Proporção de requisições da API respondidas em até 500 ms | 95%            | 30 dias | `fintrack:latency_sli:ratio_30d`      |

- **O que conta como sucesso:** qualquer resposta que não seja 5xx. Respostas 4xx (dados inválidos, não autorizado, não encontrado) são erros do cliente e não consomem o SLO.
- **Error budget:** com SLO de 99,5%, até 0,5% das requisições em 30 dias podem falhar. `fintrack:availability_error_budget:remaining_30d` mostra quanto resta (1 = intacto, 0 = esgotado, negativo = SLO violado).
- **SLA:** o FinTrack não tem um acordo formal com clientes. Um SLA, se existir, deve ser mais folgado que o SLO interno, para a equipe agir antes de descumprir o compromisso.

Os valores são o ponto de partida do projeto. Devem ser revistos com o histórico real de tráfego, a capacidade e o impacto percebido pelos usuários.

As regras ficam em `observability/prometheus/rules/slo-recording-rules.yml`.

## 6. Alertas e runbooks

Cada alerta exige uma condição sustentada (`for`) para não disparar com um pico isolado, e traz o link do seu runbook. As regras ficam em `observability/prometheus/rules/alert-rules.yml`, e os cenários de teste em `observability/prometheus/tests/alert-rules.test.yml`.

| Alerta                        | Severidade | Condição                                                |
| ----------------------------- | ---------- | ------------------------------------------------------- |
| `FintrackApiDown`             | critical   | Scrape de `/api/metrics` falhando por 2 min             |
| `FintrackHighErrorRate`       | critical   | Mais de 5% de respostas 5xx por 5 min                   |
| `FintrackErrorBudgetBurn`     | warning    | Error budget queimando 6x mais rápido que o sustentável |
| `FintrackHighLatencyP95`      | warning    | p95 acima de 1 s por 10 min                             |
| `FintrackSlowDatabaseQueries` | warning    | p95 de uma tabela acima de 500 ms por 10 min            |
| `FintrackDatabaseErrors`      | warning    | Mais de 5 consultas com falha em 5 min                  |
| `FintrackEventLoopSaturation` | warning    | Atraso p99 do event loop acima de 200 ms por 5 min      |
| `FintrackLoginFailureSpike`   | warning    | Mais de 20 falhas de login por minuto por 5 min         |

Na stack local os alertas aparecem no Prometheus e no painel do Grafana. Para notificar alguém (e-mail, Slack, Discord), o próximo passo é adicionar o Alertmanager e apontar o Prometheus para ele.

### FintrackApiDown

**Impacto:** usuários podem não conseguir usar o FinTrack.

1. Abra `/api/health`. Se responder, o problema é entre o Prometheus e a aplicação (rede, porta, token do `/api/metrics`).
2. Se não responder, veja os logs do processo ou do container (`docker logs`) e o status do `HEALTHCHECK`.
3. `503` no health indica falha no banco: confira `DATABASE_URL`, `DATABASE_AUTH_TOKEN` e a disponibilidade do Turso.

### FintrackHighErrorRate

**Impacto:** parte das operações dos usuários está falhando.

1. No painel, veja em "Taxa de erros 5xx por rota" qual rota concentra os erros e desde quando.
2. No Kibana ou no painel de logs, filtre `severity_text:ERROR` no mesmo intervalo e leia `attributes.error.message`.
3. Abra o trace de um erro pelo `trace_id` e veja qual span falhou.
4. Se começou junto com um deploy, considere reverter antes de investigar a fundo.

### FintrackErrorBudgetBurn

**Impacto:** nenhum pico grande, mas o ritmo atual de erros esgota o error budget de 30 dias em poucos dias.

1. Siga os passos de `FintrackHighErrorRate`, olhando uma janela maior (6 h).
2. Priorize a correção acima de funcionalidades novas até o ritmo voltar ao normal.

### FintrackHighLatencyP95

**Impacto:** a aplicação está lenta para uma parte dos usuários.

1. Veja se a latência subiu em todas as rotas ou numa só ("Latência p50 / p95 / p99" com o filtro de rota).
2. Compare com "Latência p95 do banco por tabela": se o banco subiu junto, siga `FintrackSlowDatabaseQueries`.
3. Compare com a saturação (event loop, memória, requisições em andamento).
4. No Jaeger, ordene os traces da rota por duração e veja qual span domina o tempo.

### FintrackSlowDatabaseQueries

**Impacto:** rotas que usam a tabela indicada ficam lentas.

1. Procure logs `db_slow_query` da tabela no período (`attributes.table`).
2. Abra um trace lento e veja o `db.query.text` do span: falta índice? A consulta varre a tabela toda?
3. Confira a latência e a disponibilidade do Turso.

### FintrackDatabaseErrors

**Impacto:** operações que dependem da tabela estão falhando.

1. Filtre os logs `db_query_failed` e leia a mensagem do erro (`SQLITE_BUSY`, timeout, conexão recusada).
2. Verifique se houve mudança de schema sem `pnpm db:push` ou credencial expirada.

### FintrackEventLoopSaturation

**Impacto:** todas as requisições do processo atrasam, porque o Node atende uma de cada vez no event loop.

1. Veja se o tráfego subiu (capacidade) ou se a CPU subiu sem aumento de tráfego (código síncrono pesado).
2. Procure rotas que processam muitos dados em memória, como agregações do painel ou exportação.

### FintrackLoginFailureSpike

**Impacto:** possível tentativa de força bruta contra contas de usuários.

1. Confirme no painel se as falhas cresceram sem aumento de logins com sucesso.
2. Considere limitar tentativas de login (rate limiting) e bloquear a origem na borda (firewall da plataforma).
3. Os logs não registram o e-mail tentado, de propósito; a origem deve ser analisada nos logs da plataforma.

## 7. Investigação guiada: "salvar gasto está falhando"

Cenário: usuários relatam que ao salvar um gasto às vezes aparece erro.

1. **Métricas — quando e onde.** No painel, "Taxa de erros 5xx por rota" mostra erros em `POST /api/expenses` a partir de um horário; `FintrackHighErrorRate` está disparando.
2. **Logs — o que aconteceu.** No Kibana, filtrando `attributes.event:http_request_failed` e `attributes.route:"/api/expenses"`, os erros mostram `SyntaxError` ao ler o corpo da requisição. Hipótese: alguns clientes estão enviando JSON malformado.
3. **Traces — onde.** O trace de um desses erros pelo `trace_id` mostra que a falha acontece antes de qualquer consulta ao banco: não há span de `INSERT`.
4. **Conclusão e melhoria.** JSON malformado é erro do cliente e deveria responder `400`, não `500`. A correção vira um teste novo em `tests/api/expenses.route.test.ts`.

O script de tráfego reproduz esse cenário de propósito: hoje a API responde `500` para JSON malformado, um defeito real encontrado com a própria telemetria.

## 8. Ciclo de incidente e melhoria contínua

```text
Detectar → Investigar → Mitigar → Aprender → Melhorar
 alerta     métricas,     reduzir    post-mortem   teste, código
            logs, traces  o impacto  sem culpa     e capacidade
```

- Registre cada incidente com o [modelo de post-mortem](modelo-postmortem.md).
- Todo incidente deve gerar pelo menos uma ação concreta: um teste que reproduza a falha, um alerta que teria detectado antes ou um ajuste de capacidade.
- Acompanhe o tempo de detecção, o tempo de recuperação e a recorrência dos incidentes.

## 9. Observabilidade no CI

A instrumentação faz parte dos requisitos de qualidade e é testada como o resto do código (`.github/workflows/ci.yml`):

- **Job `quality`:** os testes do Vitest cobrem o formato do log, o mascaramento de dados sensíveis, a correlação com o trace, os labels das métricas, o 500 genérico sem vazamento (Cenário 9 do README), o acesso ao `/api/metrics` e o `/api/health`.
- **Job `observability`:** valida a configuração do Prometheus, roda os cenários das regras de alerta (`promtool test rules`), valida a configuração do collector, o compose e o JSON do painel.

Para rodar os testes de alerta localmente: `pnpm observability:test-rules`.

## 10. Produção

- **Docker / servidor próprio:** um processo de longa duração, ideal para o Prometheus fazer scrape. Defina `METRICS_TOKEN` e configure no Prometheus `authorization.credentials_file` com o mesmo token (veja o comentário em `observability/prometheus/prometheus.yml`). A imagem já tem `HEALTHCHECK` em `/api/health`.
- **Vercel (serverless):** cada invocação pode rodar numa instância diferente, então o scrape de `/api/metrics` não representa o sistema inteiro. Use os traces e logs via OpenTelemetry (o `@vercel/otel` integra com a Vercel) e as métricas da própria plataforma.
- **Amostragem:** todos os traces são registrados por padrão. Com tráfego alto, use `OTEL_TRACES_SAMPLER=parentbased_traceidratio` e `OTEL_TRACES_SAMPLER_ARG=0.1` (10%).
- **Segredos:** nenhum token ou senha vai no Git. A senha do Grafana local vem de `GRAFANA_ADMIN_PASSWORD`; a stack local desliga a autenticação do Elasticsearch, o que só é aceitável porque a porta fica restrita à máquina.

## 11. Variáveis de ambiente

| Variável                      | Padrão     | Finalidade                                                                      |
| ----------------------------- | ---------- | ------------------------------------------------------------------------------- |
| `LOG_LEVEL`                   | `info`     | Nível mínimo de log: `debug`, `info`, `warn`, `error` ou `silent`               |
| `OTEL_SERVICE_NAME`           | `fintrack` | Nome do serviço nos logs, traces e no Jaeger                                    |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | (vazio)    | Endereço do collector, por exemplo `http://localhost:4318`. Vazio = não exporta |
| `METRICS_TOKEN`               | (vazio)    | Token do `/api/metrics` (mínimo 16 caracteres). Obrigatório em produção         |
| `DB_SLOW_QUERY_MS`            | `500`      | A partir de quantos ms uma consulta gera o log `db_slow_query`                  |

Valores inválidos impedem a aplicação de iniciar, com a lista do que está errado, em vez de falhar no primeiro log.
