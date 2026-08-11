import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { ScoredJob } from '../scoring/scorer.js';

let container: StartedPostgreSqlContainer;
// Importados dinamicamente após DATABASE_URL apontar para o container.
let repo: typeof import('./job-repository.js');
let db: typeof import('./client.js');

/**
 * Aplica as migrations versionadas (prisma/migrations) diretamente via pg.
 *
 * Executa o SQL que de fato versionamos — mais fiel que `prisma db push`
 * (que sincroniza a partir do schema, ignorando o histórico) — e sem
 * invocar o CLI do Prisma.
 */
async function applyMigrations(connectionUri: string): Promise<void> {
  const migrationsDir = join(process.cwd(), 'prisma', 'migrations');
  const migrations = readdirSync(migrationsDir)
    .filter((entry) => /^\d/.test(entry)) // pastas de migration (timestamp); ignora migration_lock.toml
    .sort();

  const client = new pg.Client({ connectionString: connectionUri });
  await client.connect();
  try {
    for (const migration of migrations) {
      const sql = readFileSync(join(migrationsDir, migration, 'migration.sql'), 'utf8');
      await client.query(sql);
    }
  } finally {
    await client.end();
  }
}

beforeAll(async () => {
  container = await new PostgreSqlContainer('postgres:17-alpine').start();
  const connectionUri = container.getConnectionUri();
  process.env['DATABASE_URL'] = connectionUri;

  await applyMigrations(connectionUri);

  repo = await import('./job-repository.js');
  db = await import('./client.js');
});

afterAll(async () => {
  await db?.prisma.$disconnect();
  await container?.stop();
});

describe('persistência de vagas (integração)', () => {
  const sample: ScoredJob[] = [
    {
      title: 'Backend Dev',
      company: 'Acme',
      url: 'https://x.com/1',
      location: null,
      description: null,
      score: 87,
      scoreBreakdown: [{ criterion: 'stack', score: 1, weight: 5, contribution: 5, detail: '3/3' }],
    },
    {
      title: 'SRE',
      company: 'Acme',
      url: 'https://x.com/2',
      location: 'Remote',
      description: null,
      score: 40,
      scoreBreakdown: [],
    },
  ];

  it('insere vagas novas e, ao revê-las, atualiza lastSeenAt sem duplicar', async () => {
    const sourceId = await repo.upsertSource('remotive', 'Remotive');

    const first = await repo.saveJobs(sourceId, sample);
    expect(first).toEqual({ inserted: 2, updated: 0 });

    const afterFirst = await db.prisma.job.findFirstOrThrow({
      where: { url: 'https://x.com/1' },
    });
    // Score e breakdown são persistidos no insert.
    expect(afterFirst.score).toBe(87);
    expect(afterFirst.scoreBreakdown).toEqual(sample[0]?.scoreBreakdown);

    // Espaço para o timestamp avançar de forma perceptível (precisão de ms).
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 50);
    });

    // Segunda coleta idêntica: nada novo, tudo revisto.
    const second = await repo.saveJobs(sourceId, sample);
    expect(second).toEqual({ inserted: 0, updated: 2 });

    // Não duplicou.
    expect(await db.prisma.job.count()).toBe(2);

    const afterSecond = await db.prisma.job.findFirstOrThrow({
      where: { url: 'https://x.com/1' },
    });
    // firstSeenAt permanece; lastSeenAt avança.
    expect(afterSecond.firstSeenAt.getTime()).toBe(afterFirst.firstSeenAt.getTime());
    expect(afterSecond.lastSeenAt.getTime()).toBeGreaterThan(afterFirst.lastSeenAt.getTime());
  });

  it('upsertSource é idempotente (mesmo slug retorna o mesmo id)', async () => {
    const first = await repo.upsertSource('remotive', 'Remotive');
    const second = await repo.upsertSource('remotive', 'Remotive Renomeada');
    expect(second).toBe(first);

    const count = await db.prisma.source.count();
    expect(count).toBe(1);
  });

  it('recordSourceRun grava status e duração da última coleta', async () => {
    const sourceId = await repo.upsertSource('greenhouse', 'Greenhouse');

    await repo.recordSourceRun(sourceId, { status: 'success', durationMs: 1234 });

    const source = await db.prisma.source.findUniqueOrThrow({ where: { id: sourceId } });
    expect(source.lastRunStatus).toBe('success');
    expect(source.lastRunDurationMs).toBe(1234);
    expect(source.lastRunAt).not.toBeNull();
  });
});
