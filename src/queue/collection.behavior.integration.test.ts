import { RedisContainer, type StartedRedisContainer } from '@testcontainers/redis';
import { Queue, Worker } from 'bullmq';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

let container: StartedRedisContainer;
let createRedisConnection: (typeof import('./connection.js'))['createRedisConnection'];
let COLLECTION_JOB_OPTIONS: (typeof import('./job-options.js'))['COLLECTION_JOB_OPTIONS'];

// Recursos criados por teste, fechados no afterEach.
const cleanups: Array<() => Promise<void>> = [];

beforeAll(async () => {
  container = await new RedisContainer('redis:7-alpine').start();
  process.env['REDIS_URL'] = container.getConnectionUrl();

  // Importados após REDIS_URL apontar para o container.
  ({ createRedisConnection } = await import('./connection.js'));
  ({ COLLECTION_JOB_OPTIONS } = await import('./job-options.js'));
});

afterEach(async () => {
  await Promise.all(cleanups.map((close) => close()));
  cleanups.length = 0;
});

afterAll(async () => {
  await container?.stop();
});

describe('comportamento da fila de coleta (integração)', () => {
  it('reexecuta um job que falha, respeitando a política de attempts', async () => {
    const queue = new Queue('behavior-retry', { connection: createRedisConnection() });
    let runs = 0;

    const worker = new Worker(
      'behavior-retry',
      () => {
        runs += 1;
        if (runs < (COLLECTION_JOB_OPTIONS.attempts ?? 1)) {
          throw new Error('falha transitória');
        }
        return Promise.resolve('ok');
      },
      { connection: createRedisConnection() },
    );
    cleanups.push(
      () => worker.close(),
      () => queue.close(),
    );

    const completed = new Promise<void>((resolve) => {
      worker.on('completed', () => {
        resolve();
      });
    });

    // Usa a política real, mas com backoff curto para o teste ser rápido.
    await queue.add(
      'retry',
      {},
      { ...COLLECTION_JOB_OPTIONS, backoff: { type: 'fixed', delay: 50 } },
    );
    await completed;

    // Rodou até completar: attempts-1 falhas + 1 sucesso.
    expect(runs).toBe(COLLECTION_JOB_OPTIONS.attempts);
  });

  it('um job que falha não impede outro de completar (isolamento)', async () => {
    const queue = new Queue<{ shouldFail: boolean }>('behavior-isolation', {
      connection: createRedisConnection(),
    });

    const completedNames: string[] = [];
    const failedNames: string[] = [];

    const worker = new Worker<{ shouldFail: boolean }>(
      'behavior-isolation',
      (job) => {
        if (job.data.shouldFail) {
          throw new Error('job com falha');
        }
        return Promise.resolve('ok');
      },
      { connection: createRedisConnection(), concurrency: 2 },
    );
    cleanups.push(
      () => worker.close(),
      () => queue.close(),
    );

    worker.on('completed', (job) => completedNames.push(job.name));
    worker.on('failed', (job) => failedNames.push(job?.name ?? ''));

    // attempts: 1 para o job ruim falhar de vez (sem retry) e o teste ser direto.
    await queue.add('bom', { shouldFail: false }, { attempts: 1 });
    await queue.add('ruim', { shouldFail: true }, { attempts: 1 });

    await vi.waitFor(
      () => {
        expect(completedNames).toContain('bom');
        expect(failedNames).toContain('ruim');
      },
      { timeout: 10_000, interval: 100 },
    );
  });
});
