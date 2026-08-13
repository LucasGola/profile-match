import type { FastifyPluginCallback } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { rescoreAllJobs } from '../../pipeline/rescore.js';
import { loadProfile, profileSchema, saveProfile } from '../../scoring/profile.js';

/** Plugin com as rotas de perfil (`/profile`). */
export const profileRoutes: FastifyPluginCallback = (app, _opts, done) => {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  typed.get('/profile', () => loadProfile());

  typed.put('/profile', { schema: { body: profileSchema } }, async (request) => {
    const profile = request.body;
    saveProfile(profile);
    // Perfil mudou → re-pontua as vagas já coletadas para refletir na hora.
    const rescored = await rescoreAllJobs(profile);
    return { profile, rescored };
  });

  done();
};
