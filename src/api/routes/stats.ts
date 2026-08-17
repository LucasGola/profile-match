import type { FastifyPluginCallback } from 'fastify';
import { getStats } from '../../db/job-repository.js';

/** Plugin com a rota de estatísticas (`/stats`) para os gráficos. */
export const statsRoutes: FastifyPluginCallback = (app, _opts, done) => {
  app.get('/stats', () => getStats());
  done();
};
