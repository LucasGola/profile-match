import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import Fastify from 'fastify';
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
} from 'fastify-type-provider-zod';
import { logger } from '../logger.js';
import { jobRoutes } from './routes/jobs.js';
import { sourceRoutes } from './routes/sources.js';

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

  // OpenAPI/Swagger gerado a partir dos schemas zod das rotas.
  // Registrado antes das rotas para o hook onRoute capturá-las.
  app.register(fastifySwagger, {
    openapi: {
      info: { title: 'Profile Match API', version: '0.1.0' },
    },
    transform: jsonSchemaTransform,
  });
  app.register(fastifySwaggerUi, { routePrefix: '/docs' });

  app.get('/health', () => ({ status: 'ok' }));
  app.register(jobRoutes);
  app.register(sourceRoutes);

  return app;
}
