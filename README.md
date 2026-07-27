# Profile Match

[![CI](https://github.com/LucasGola/profile-match/actions/workflows/ci.yml/badge.svg)](https://github.com/LucasGola/profile-match/actions/workflows/ci.yml)

> Agregador inteligente de vagas: coleta de múltiplas fontes legítimas, normaliza,
> deduplica, pontua a aderência ao seu perfil e notifica apenas o que importa —
> tudo exposto por uma API própria.

O foco do projeto é a **engenharia em volta** da feature: coleta concorrente e
resiliente, processamento assíncrono com fila e workers, modelagem de dados,
matching explicável (sem ML), API cacheada, testes, CI/CD e deploy.

> 🚧 **Em desenvolvimento ativo.** Já concluído: fundação (Milestone 0), slice
> vertical de coleta (Milestone 1), coleta assíncrona/concorrente com fila e
> workers a partir de 3 fontes (Milestone 2 — Remotive, We Work Remotely e
> Greenhouse) e deduplicação com histórico de vagas (Milestone 3). As demais
> funcionalidades seguem em construção incremental.

## Stack

| Camada          | Tecnologia                      |
| --------------- | ------------------------------- |
| Runtime         | Node.js 22 (LTS) + TypeScript   |
| API HTTP        | Fastify _(planejado)_           |
| Fila / workers  | BullMQ + Redis                  |
| Fontes          | Remotive, WWR (RSS), Greenhouse |
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

# 5. Em um terminal: iniciar o worker (consome a fila e persiste)
npm run worker

# 6. Em outro terminal: disparar uma coleta (enfileira 1 job por fonte)
npm run collect
```

A coleta é assíncrona: `collect` apenas enfileira 1 job por fonte na fila
(BullMQ/Redis); o `worker` consome os jobs e persiste as vagas.

### Scripts úteis

| Script                     | Ação                                         |
| -------------------------- | -------------------------------------------- |
| `npm run dev`              | Roda a app em modo watch (tsx)               |
| `npm run worker`           | Inicia o worker que consome a fila de coleta |
| `npm run collect`          | Enfileira 1 job de coleta por fonte          |
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

## Como adicionar uma nova fonte

As fontes são plugáveis: adicionar uma não exige mudar o pipeline, a fila nem a
persistência.

1. Crie uma classe em `src/sources/<slug>/` que implemente a interface
   [`JobSource`](./src/sources/job-source.ts) — `slug`, `name` e
   `fetch(): Promise<NormalizedJob[]>`.
2. Dentro do `fetch()`, faça a requisição (use `fetch` nativo + `AbortSignal.timeout`
   para manter o timeout consistente) e mapeie o retorno para o schema canônico
   via [`normalizedJobSchema`](./src/pipeline/job.schema.ts). Mantenha o
   mapeamento numa função/método `normalize()` separado — assim ele é testável
   sem rede.
3. Registre a fonte em [`src/sources/registry.ts`](./src/sources/registry.ts).
4. Escreva o teste do `normalize()` primeiro (TDD), com um payload de exemplo
   real da fonte.

Pronto: o produtor passará a enfileirar um job para a nova fonte e o worker a
coletará junto com as demais, de forma isolada.

## Licença

[MIT](./LICENSE)
