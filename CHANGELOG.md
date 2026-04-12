# Changelog

Todas as mudanças notáveis deste projeto serão documentadas neste arquivo.

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
