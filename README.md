# Profile Match

[![CI](https://github.com/LucasGola/profile-match/actions/workflows/ci.yml/badge.svg)](https://github.com/LucasGola/profile-match/actions/workflows/ci.yml)

> Agregador inteligente de vagas: coleta de múltiplas fontes legítimas, normaliza,
> deduplica, pontua a aderência ao seu perfil e notifica apenas o que importa —
> tudo exposto por uma API própria.

O foco do projeto é a **engenharia em volta** da feature: coleta concorrente e
resiliente, processamento assíncrono com fila e workers, modelagem de dados,
matching explicável (sem ML), API cacheada, testes, CI/CD e deploy.

> 🚧 **Em desenvolvimento ativo.** A fundação (Milestone 0) e o primeiro slice
> vertical de coleta (Milestone 1: Remotive → normalização → persistência) estão
> concluídos; as demais funcionalidades estão sendo construídas de forma incremental.

## Stack

| Camada          | Tecnologia                      |
| --------------- | ------------------------------- |
| Runtime         | Node.js 22 (LTS) + TypeScript   |
| API HTTP        | Fastify _(planejado)_           |
| Fila / workers  | BullMQ + Redis _(planejado)_    |
| Banco de dados  | PostgreSQL + Prisma             |
| Matching        | Regras + fuse.js _(planejado)_  |
| Notificação     | Telegram / e-mail _(planejado)_ |
| Logs            | pino                            |
| Testes          | Vitest + Testcontainers         |
| Lint / format   | ESLint + Prettier               |
| CI              | GitHub Actions                  |
| Containerização | Docker + docker-compose         |

## Como rodar (desenvolvimento)

Pré-requisitos: Node.js 22+ e Docker.

```bash
# 1. Instalar dependências
npm install

# 2. Configurar variáveis de ambiente
cp .env.example .env

# 3. Subir Postgres e Redis
npm run docker:up

# 4. Aplicar as migrations do banco
npm run db:migrate

# 5. Rodar a aplicação em modo watch
npm run dev

# 6. (opcional) Rodar uma coleta manual das fontes
npm run collect
```

### Scripts úteis

| Script                     | Ação                                         |
| -------------------------- | -------------------------------------------- |
| `npm run dev`              | Roda a app em modo watch (tsx)               |
| `npm run collect`          | Executa uma coleta manual das fontes         |
| `npm run build`            | Compila para `dist/`                         |
| `npm run typecheck`        | Checagem de tipos sem emitir                 |
| `npm run lint`             | ESLint                                       |
| `npm run format`           | Formata com Prettier                         |
| `npm test`                 | Testes unitários (Vitest)                    |
| `npm run test:integration` | Testes de integração (Testcontainers)        |
| `npm run docker:up`        | Sobe Postgres + Redis                        |
| `npm run docker:down`      | Para os containers (mantém os dados)         |
| `npm run docker:reset`     | Para e **apaga** os volumes (reset do banco) |
| `npm run db:migrate`       | Cria/aplica migrations (Prisma)              |
| `npm run db:studio`        | Abre o Prisma Studio                         |

## Licença

[MIT](./LICENSE)
