import Fastify from 'fastify';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import { logger } from '../logger.js';
import { jobRoutes } from './routes/jobs.js';

/**
 * Constrói a instância do Fastify com as rotas registradas.
 *
 * Exposto separado do listen para permitir testes via `app.inject()`
 * (in-process, sem abrir porta). Tipo de retorno inferido para preservar
 * o tipo do logger pino injetado.
 */
export function buildApp() {
  const app = Fastify({ loggerInstance: logger });

  // Validação de request via zod (reaproveita nossos schemas).
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  app.get('/health', () => ({ status: 'ok' }));
  app.register(jobRoutes);

  return app;
}
