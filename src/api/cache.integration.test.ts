import { RedisContainer, type StartedRedisContainer } from '@testcontainers/redis';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

let container: StartedRedisContainer;
let cache: typeof import('./cache.js');

beforeAll(async () => {
  container = await new RedisContainer('redis:7-alpine').start();
  process.env['REDIS_URL'] = container.getConnectionUrl();
  cache = await import('./cache.js');
});

afterAll(async () => {
  await cache?.closeCache();
  await container?.stop();
});

describe('withCache (integração)', () => {
  it('executa o producer uma vez e serve a 2ª chamada do cache', async () => {
    const producer = vi.fn(() => Promise.resolve({ n: 1 }));

    const first = await cache.withCache('test:jobs', producer);
    const second = await cache.withCache('test:jobs', producer);

    expect(first).toEqual({ n: 1 });
    expect(second).toEqual({ n: 1 });
    expect(producer).toHaveBeenCalledOnce();
  });
});
