# Fluxo Git e Gitflow — FinTrack

## 1. Objetivo

Padronizar o trabalho da equipe e garantir que alterações sejam desenvolvidas, revisadas, testadas e integradas de maneira previsível.

## 2. Branches

```text
main
  └── código estável de produção

develop
  └── integração das funcionalidades

feature/*
  └── desenvolvimento de novas funcionalidades

release/*
  └── preparação de versões

hotfix/*
  └── correções urgentes em produção
```

## 3. Fluxo da Menção 1

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
CI
   ↓
main
   ↓
Deploy
```

## 4. Criando uma feature

Sempre partir de `develop`:

```bash
git checkout develop
git pull origin develop
git checkout -b feature/nome-da-tarefa
```

Exemplo:

```bash
git checkout -b feature/documentacao-ambientes
```

## 5. Commits

Usar mensagens curtas e descritivas:

```text
feat: adiciona nova funcionalidade
fix: corrige validação
test: adiciona testes
docs: atualiza documentação
ci: configura pipeline
build: configura release
```

Exemplo:

```bash
git add docs/ambientes.md
git commit -m "docs: documenta ambientes do FinTrack"
git push -u origin feature/documentacao-ambientes
```

## 6. Pull Request

Todo trabalho deve ser integrado por Pull Request.

O PR deve informar:

- descrição da alteração;
- funcionalidades implementadas;
- testes realizados;
- evidências;
- possíveis impactos.

Antes do merge:

- CI deve estar verde;
- outro integrante deve revisar;
- conflitos devem ser resolvidos;
- a branch deve estar atualizada quando necessário.

## 7. Regras de merge

- Não fazer commits diretamente na `main`.
- Usar Pull Request.
- Exigir revisão de código.
- Exigir aprovação do pipeline de CI.
- Preferir branches de curta duração.
- Integrar funcionalidades em `develop`.
- Usar `release/*` para preparar versões.
- Usar `hotfix/*` somente para correções urgentes em produção.

## 8. Comandos essenciais

```bash
git status
git branch
git switch develop
git pull origin develop
git switch -c feature/minha-tarefa
git add .
git commit -m "docs: atualiza documentação"
git push -u origin feature/minha-tarefa
```

Para atualizar a branch:

```bash
git switch develop
git pull origin develop
git switch feature/minha-tarefa
git merge develop
```

## 9. Critério de aceite

Qualquer integrante deve conseguir criar uma branch, abrir um Pull Request e seguir o fluxo definido sem depender de instruções externas.
