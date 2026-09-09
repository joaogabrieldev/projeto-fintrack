# Fluxo Git e Gitflow — FinTrack

## 1. Objetivo

Este documento define o fluxo de trabalho com Git utilizado pela equipe
do projeto FinTrack, organizando branches, commits, Pull Requests e merges.

O objetivo é evitar alterações diretamente na branch principal e garantir
que as mudanças sejam revisadas antes de serem integradas ao projeto.

---

## 2. Estrutura de branches

O projeto utiliza as seguintes branches:

- `main`: versão estável do sistema e destinada à produção.
- `develop`: branch de integração das funcionalidades desenvolvidas.
- `feature/*`: branches utilizadas para desenvolver novas funcionalidades
  ou realizar alterações específicas.
- `release/*`: branches utilizadas para preparar uma nova versão para
  publicação.

### Exemplo

```text
main
  ↑
release/*
  ↑
develop
  ↑
feature/*
