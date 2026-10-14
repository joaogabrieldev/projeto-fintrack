# Docker e Docker Hub — FinTrack

## 1. Visão geral

A aplicação é empacotada em uma imagem Docker a partir do `Dockerfile` na raiz, usando o modo `output: "standalone"` do Next.js. A imagem roda o servidor Node do Next (`node server.js`) na porta `3000`, com usuário sem privilégios.

O workflow `.github/workflows/docker.yml` constrói a imagem e publica no Docker Hub automaticamente.

| Evento                    | Tags publicadas                  |
| ------------------------- | -------------------------------- |
| Push na `main`            | `latest`, `main`, `sha-<commit>` |
| Push na `develop`         | `develop`, `sha-<commit>`        |
| Tag `v1.2.3`              | `1.2.3`, `1.2`, `sha-<commit>`   |
| Execução manual (Actions) | conforme a branch escolhida      |

## 2. Configuração única (Docker Hub + GitHub)

1. Criar uma conta em <https://hub.docker.com> (ou usar uma organização da equipe).
2. No Docker Hub, criar o repositório `fintrack` em **Repositories → Create repository**. Se ele não existir, o primeiro push o cria como público.
3. Em **Account settings → Personal access tokens**, gerar um token com permissão **Read & Write**.
4. No GitHub, em **Settings → Secrets and variables → Actions** do repositório:
   - aba **Variables**: criar `DOCKERHUB_USERNAME` com o usuário/organização do Docker Hub;
   - aba **Secrets**: criar `DOCKERHUB_TOKEN` com o token gerado.
5. Fazer push na `main` (ou rodar o workflow **Docker** manualmente em **Actions**).

A imagem fica disponível em `docker.io/<DOCKERHUB_USERNAME>/fintrack`.

## 3. Executando a imagem

A imagem não contém segredos: as variáveis são passadas no `docker run`.

| Variável              | Obrigatória         | Descrição                                      |
| --------------------- | ------------------- | ---------------------------------------------- |
| `AUTH_SECRET`         | Sim                 | Segredo do Auth.js (`npx auth secret`)         |
| `DATABASE_URL`        | Sim                 | `libsql://...` (Turso) ou `file:/app/data/...` |
| `DATABASE_AUTH_TOKEN` | Com Turso           | Token do banco remoto                          |
| `NEXTAUTH_URL`        | Não                 | URL pública da aplicação                       |
| `PORT`                | Não (padrão `3000`) | Porta em que o servidor escuta                 |

### Com Turso (recomendado)

```bash
docker run -d -p 3000:3000 --env-file .env <usuario>/fintrack:latest
```

O schema deve estar aplicado no banco (`pnpm db:push` com o `.env` apontando para o Turso).

### Com SQLite local

O arquivo do banco fica fora do container, em `./data`:

```bash
mkdir -p data
DATABASE_URL=file:./data/fintrack.db pnpm db:push

docker run -d -p 3000:3000 \
  -e AUTH_SECRET=<seu-segredo> \
  -e DATABASE_URL=file:/app/data/fintrack.db \
  -v "$PWD/data:/app/data" \
  --user "$(id -u):$(id -g)" \
  <usuario>/fintrack:latest
```

O `--user` faz o container gravar no diretório com o mesmo dono do host (necessário no Linux; no Docker Desktop é opcional).

## 4. Build local

```bash
docker build -t fintrack .
docker run -p 3000:3000 --env-file .env fintrack
```

O `.dockerignore` impede que `.env`, `data/` e `node_modules` entrem no contexto de build.

A imagem é publicada apenas para `linux/amd64`. Em Macs com Apple Silicon ela roda via emulação do Docker Desktop.
