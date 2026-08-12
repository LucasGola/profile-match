import type { FastifyPluginCallback } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { findJobById, findJobs } from '../../db/job-repository.js';
import { withCache } from '../cache.js';

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  minScore: z.coerce.number().int().min(0).max(100).optional(),
  source: z.string().min(1).optional(),
  since: z.coerce.date().optional(),
  stack: z.string().min(1).optional(),
});

const idParamsSchema = z.object({ id: z.string().min(1) });

/** Plugin com as rotas de vagas (`/jobs`, `/jobs/:id`). */
export const jobRoutes: FastifyPluginCallback = (app, _opts, done) => {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  typed.get('/jobs', { schema: { querystring: listQuerySchema } }, async (request) => {
    const { page, pageSize, minScore, source, since, stack } = request.query;
    const key = `jobs:v1:${String(page)}:${String(pageSize)}:${String(minScore ?? '')}:${source ?? ''}:${since?.toISOString() ?? ''}:${stack ?? ''}`;
    return withCache(key, () => findJobs({ minScore, source, since, stack }, { page, pageSize }));
  });

  typed.get('/jobs/:id', { schema: { params: idParamsSchema } }, async (request, reply) => {
    const job = await findJobById(request.params.id);
    if (!job) {
      return reply.status(404).send({ error: 'vaga não encontrada' });
    }
    return job;
  });

  done();
};
