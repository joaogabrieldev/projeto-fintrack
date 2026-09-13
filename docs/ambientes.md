# Ambientes — FinTrack

## 1. Objetivo

Este documento descreve os ambientes utilizados pelo FinTrack na Menção 1 de Integração DevOps, as variáveis necessárias e o procedimento para configurar, executar e validar a aplicação.

## 2. Ambientes

| Ambiente | Objetivo | Uso |
|---|---|---|
| Desenvolvimento | Execução local durante o desenvolvimento | Cada integrante |
| Homologação / Preview | Validar Pull Requests e releases antes da produção | Equipe |
| Produção | Versão publicada e disponível aos usuários | Usuários finais |

### Desenvolvimento

O ambiente de desenvolvimento é executado localmente. O projeto utiliza Node.js 20+, pnpm 9+, Next.js e banco configurado por variáveis de ambiente.

Fluxo básico:

```bash
pnpm install
cp .env.example .env
# configurar as variáveis do .env
mkdir -p data
pnpm db:push
pnpm dev
```

A aplicação é acessada em `http://localhost:3000`.

### Homologação / Preview

É o ambiente destinado à validação de alterações provenientes de Pull Requests e releases. Quando a plataforma de deploy utilizada pela equipe oferecer Preview Deployments, cada PR poderá possuir uma versão temporária para validação.

Antes de aprovar uma alteração, devem ser verificados:

- funcionamento da funcionalidade alterada;
- ausência de erros visuais;
- testes automatizados;
- lint;
- typecheck;
- build;
- comportamento das variáveis de ambiente.

### Produção

Produção corresponde à versão integrada na `main` e publicada pelo processo de deploy contínuo definido pela equipe.

Nenhum segredo deve ser armazenado no Git. Variáveis de produção devem ser configuradas na plataforma de hospedagem.

## 3. Variáveis de ambiente

O arquivo `.env.example` atualmente documenta as seguintes variáveis:

| Variável | Finalidade | Sensível? |
|---|---|---|
| `AUTH_SECRET` | Segredo utilizado pelo Auth.js | Sim |
| `NEXTAUTH_URL` | URL base da aplicação | Não, em geral |
| `DATABASE_URL` | URL de conexão com o banco | Pode ser |
| `DATABASE_AUTH_TOKEN` | Token de autenticação do banco Turso/libSQL | Sim |

O `.env.example` deve conter apenas valores de exemplo. Os valores reais ficam somente no `.env` local ou nos Secrets/Environment Variables da plataforma de hospedagem.

## 4. Banco de dados

O projeto utiliza SQLite + Drizzle ORM conforme a documentação do projeto. O `.env.example` também contém instruções para uso do Turso/libSQL.

Para o ambiente local, o workflow de CI usa:

```text
DATABASE_URL=file:./data/fintrack.db
```

Para configurar o schema:

```bash
mkdir -p data
pnpm db:push
```

## 5. AUTH_SECRET

O `AUTH_SECRET` é obrigatório para o Auth.js.

Gerar um segredo:

```bash
npx auth secret
```

Nunca copie o segredo real para:

- GitHub;
- README;
- prints;
- Pull Requests;
- arquivos versionados;
- slides.

## 6. Segurança

### Nunca versionar

- `.env` com valores reais;
- tokens;
- senhas;
- chaves privadas;
- secrets de produção.

### Pode ser versionado

- `.env.example`;
- documentação;
- comandos;
- valores fictícios;
- configuração não sensível.

## 7. Checklist de execução local

- [ ] Node.js 20+ instalado
- [ ] pnpm instalado
- [ ] Repositório clonado
- [ ] `pnpm install` executado
- [ ] `.env` criado a partir do `.env.example`
- [ ] `AUTH_SECRET` configurado
- [ ] banco configurado
- [ ] `pnpm db:push` executado
- [ ] `pnpm test` executado
- [ ] `pnpm lint` executado
- [ ] `pnpm typecheck` executado
- [ ] `pnpm build` executado
- [ ] `pnpm dev` executado
- [ ] aplicação validada no navegador

## 8. Checklist de homologação

- [ ] Dependências instaladas
- [ ] Variáveis de ambiente configuradas
- [ ] Banco disponível
- [ ] Testes passando
- [ ] Lint passando
- [ ] Typecheck passando
- [ ] Build passando
- [ ] Funcionalidade alterada validada
- [ ] Nenhum segredo exposto
- [ ] Evidências capturadas

## 9. Critério de aceite da responsabilidade

Um integrante que acabou de clonar o repositório deve conseguir configurar o ambiente e executar a aplicação seguindo somente esta documentação.
