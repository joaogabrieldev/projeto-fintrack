# Modelo de post-mortem (sem culpa)

Copie este modelo para registrar um incidente. O objetivo é entender o que no sistema permitiu a falha e o que muda para ela não se repetir, não encontrar culpados. Pessoas agiram com a informação que tinham no momento.

---

## Incidente: <título curto>

| Campo               | Valor                                                         |
| ------------------- | ------------------------------------------------------------- |
| Data                | AAAA-MM-DD                                                    |
| Severidade          | crítica / alta / média / baixa                                |
| Duração do impacto  | de HH:MM até HH:MM (fuso)                                     |
| Tempo até detectar  | do início do impacto até o primeiro alerta ou relato          |
| Tempo até recuperar | do início do impacto até a normalização                       |
| Alerta que disparou | ex.: `FintrackHighErrorRate` (ou "nenhum: relato de usuário") |
| Responsáveis        | quem conduziu a resposta                                      |

### Resumo

Duas ou três frases: o que os usuários sentiram, por quanto tempo e qual foi a causa.

### Impacto

- Rotas e funcionalidades afetadas.
- Proporção de requisições com erro ou lentas (do painel do Grafana).
- Error budget consumido do SLO de 30 dias.

### Linha do tempo

| Horário | Evento                                         |
| ------- | ---------------------------------------------- |
| HH:MM   | Deploy da versão X / mudança Y                 |
| HH:MM   | Primeiro erro nos logs (`trace_id` de exemplo) |
| HH:MM   | Alerta disparou / usuário relatou              |
| HH:MM   | Mitigação aplicada (ex.: rollback)             |
| HH:MM   | Sinais voltaram ao normal                      |

### Evidências

- **Métricas:** gráfico ou consulta PromQL que mostra o início e o fim.
- **Logs:** eventos relevantes (sem dados pessoais).
- **Traces:** `trace_id` de uma requisição afetada e o span que falhou ou demorou.

### Causa

O que aconteceu tecnicamente e por que as defesas existentes (testes, revisão, alertas) não pegaram antes.

### O que funcionou e o que não funcionou

- Funcionou:
- Não funcionou:
- Tivemos sorte em:

### Ações

Cada ação tem dono e prazo. Prefira ações que mudam o sistema às que dependem de "tomar mais cuidado".

| Ação                                                         | Tipo           | Dono | Prazo |
| ------------------------------------------------------------ | -------------- | ---- | ----- |
| Teste automatizado que reproduz a falha                      | prevenção (CI) |      |       |
| Alerta ou ajuste de limite que teria detectado antes         | detecção       |      |       |
| Cenário do incidente em `alert-rules.test.yml`, se aplicável | detecção (CI)  |      |       |
| Mudança de código, configuração ou capacidade                | correção       |      |       |
