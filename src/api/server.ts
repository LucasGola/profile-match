import Fastify from 'fastify';
import { logger } from '../logger.js';

/**
 * Constrói a instância do Fastify com as rotas registradas.
 *
 * Exposto separado do listen para permitir testes via `app.inject()`
 * (in-process, sem abrir porta). Tipo de retorno inferido para preservar
 * o tipo do logger pino injetado.
 */
export function buildApp() {
  const app = Fastify({ loggerInstance: logger });

  app.get('/health', () => ({ status: 'ok' }));

  return app;
}
