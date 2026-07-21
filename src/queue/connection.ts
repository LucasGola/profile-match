import { Redis, type RedisOptions } from 'ioredis';

const redisUrl = process.env['REDIS_URL'] ?? 'redis://localhost:6379';

/**
 * Cria uma conexão ioredis para uso com BullMQ.
 *
 * `maxRetriesPerRequest: null` é exigido pelo BullMQ para as conexões
 * bloqueantes dos workers; aplicamos por padrão a todas para consistência.
 */
export function createRedisConnection(options: RedisOptions = {}): Redis {
  return new Redis(redisUrl, {
    maxRetriesPerRequest: null,
    ...options,
  });
}
