import type { FastifyPluginCallback } from 'fastify';
import { listSources } from '../../db/job-repository.js';

/** Plugin com a rota de fontes (`/sources`). */
export const sourceRoutes: FastifyPluginCallback = (app, _opts, done) => {
  app.get('/sources', () => listSources());
  done();
};
