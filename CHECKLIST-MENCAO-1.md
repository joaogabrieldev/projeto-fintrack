# Checklist — Menção 1 / FinTrack

## Requisitos técnicos

- [ ] Git/Gitflow documentado
- [ ] Branch `develop` criada
- [ ] Branches `feature/*` utilizadas
- [ ] Branches `release/*` documentadas/utilizadas
- [ ] Pull Request Template criado
- [ ] Cada integrante participou de um PR
- [ ] Cada integrante revisou pelo menos um PR
- [ ] CI executa em Pull Requests
- [ ] CI executa em `develop`
- [ ] CI executa em `main`
- [ ] CI executa install
- [ ] CI executa lint
- [ ] CI executa typecheck
- [ ] CI executa testes
- [ ] CI executa build
- [ ] Testes obrigatórios passando
- [ ] Build passando
- [ ] Deploy validado
- [ ] Release documentada
- [ ] Tag de versão criada
- [ ] `CHANGELOG.md` atualizado
- [ ] Ambientes documentados
- [ ] `.env.example` revisado
- [ ] Secrets protegidos
- [ ] Checklist de execução criado
- [ ] README atualizado
- [ ] Evidências reais capturadas

## Evidências a capturar

1. Estrutura de branches no GitHub.
2. Um Pull Request aberto.
3. Pipeline CI com sucesso.
4. Pipeline CI bloqueando uma alteração com erro, se a equipe conseguir demonstrar com segurança.
5. Testes passando.
6. Build passando.
7. Release/tag.
8. Deploy funcionando.
9. Aplicação em produção/preview.
10. Configuração dos ambientes sem mostrar secrets.

## Demonstração coletiva

```text
feature/*
   ↓
Pull Request
   ↓
CI
   ↓
develop
   ↓
release/*
   ↓
main
   ↓
Deploy
```

A equipe deve conseguir explicar o papel de cada etapa.

## Parte do Carlos Eduardo

- [ ] `docs/ambientes.md`
- [ ] `.env.example` revisado
- [ ] Checklist de execução/homologação
- [ ] Documentação final
- [ ] Evidências dos ambientes
- [ ] Parte visual dos slides
- [ ] Fala de aproximadamente 5 minutos
- [ ] Explicar ambientes
- [ ] Explicar variáveis
- [ ] Explicar como a documentação permite executar o projeto
- [ ] Participar da demonstração final
- [ ] Explicar dificuldades/conclusão
