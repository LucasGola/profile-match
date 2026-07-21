import { execSync } from 'node:child_process';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { NormalizedJob } from '../pipeline/job.schema.js';

let container: StartedPostgreSqlContainer;
// Importados dinamicamente após DATABASE_URL apontar para o container.
let repo: typeof import('./job-repository.js');
let db: typeof import('./client.js');

beforeAll(async () => {
  container = await new PostgreSqlContainer('postgres:17-alpine').start();
  const connectionUri = container.getConnectionUri();
  process.env['DATABASE_URL'] = connectionUri;

  // Aplica o schema no banco efêmero. --url sobrescreve a datasource
  // diretamente (mais robusto que depender do env/dotenv).
  execSync(`npx prisma db push --url "${connectionUri}" --accept-data-loss`, {
    stdio: 'inherit',
    env: process.env,
  });

  repo = await import('./job-repository.js');
  db = await import('./client.js');
});

afterAll(async () => {
  await db?.prisma.$disconnect();
  await container?.stop();
});

describe('persistência de vagas (integração)', () => {
  const sample: NormalizedJob[] = [
    {
      title: 'Backend Dev',
      company: 'Acme',
      url: 'https://x.com/1',
      location: null,
      description: null,
    },
    {
      title: 'SRE',
      company: 'Acme',
      url: 'https://x.com/2',
      location: 'Remote',
      description: null,
    },
  ];

  it('persiste vagas novas e ignora duplicatas entre coletas', async () => {
    const sourceId = await repo.upsertSource('remotive', 'Remotive');

    const inserted = await repo.saveJobs(sourceId, sample);
    expect(inserted).toBe(2);

    // Uma segunda coleta idêntica não deve inserir nada (dedup por hash).
    const reinserted = await repo.saveJobs(sourceId, sample);
    expect(reinserted).toBe(0);

    const total = await db.prisma.job.count();
    expect(total).toBe(2);
  });

  it('upsertSource é idempotente (mesmo slug retorna o mesmo id)', async () => {
    const first = await repo.upsertSource('remotive', 'Remotive');
    const second = await repo.upsertSource('remotive', 'Remotive Renomeada');
    expect(second).toBe(first);

    const count = await db.prisma.source.count();
    expect(count).toBe(1);
  });
});
