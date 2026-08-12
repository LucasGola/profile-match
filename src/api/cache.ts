import { createRedisConnection } from '../queue/connection.js';

// lazyConnect: só abre a conexão no primeiro comando (import seguro nos testes).
const redis = createRedisConnection({ lazyConnect: true });

const TTL_SECONDS = Number(process.env['CACHE_TTL_SECONDS'] ?? '60');

/**
 * Retorna o valor cacheado da `key`, ou executa `producer`, cacheia o
 * resultado (TTL curto) e o retorna.
 *
 * Sem invalidação explícita: com TTL curto, o cache expira naturalmente
 * (suficiente para dados de vaga, que não mudam a cada segundo).
 */
export async function withCache<T>(key: string, producer: () => Promise<T>): Promise<T> {
  const cached = await redis.get(key);
  if (cached !== null) {
    return JSON.parse(cached) as T;
  }

  const value = await producer();
  await redis.set(key, JSON.stringify(value), 'EX', TTL_SECONDS);
  return value;
}

/** Fecha a conexão de cache (usar no shutdown da API). */
export async function closeCache(): Promise<void> {
  await redis.quit();
}
