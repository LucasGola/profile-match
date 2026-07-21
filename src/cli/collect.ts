import { prisma } from '../db/client.js';
import { saveJobs, upsertSource } from '../db/job-repository.js';
import { logger } from '../logger.js';
import { sources } from '../sources/registry.js';

/**
 * Executa uma coleta manual de todas as fontes registradas.
 *
 * Cada fonte é isolada: uma que falhe não interrompe as demais. A versão
 * assíncrona com fila/workers entra no Milestone 2 — este CLI é o vertical
 * slice que prova o fluxo coleta → normalização → persistência.
 */
async function main(): Promise<void> {
  logger.info({ sources: sources.map((s) => s.slug) }, 'iniciando coleta');

  for (const source of sources) {
    const log = logger.child({ source: source.slug });
    try {
      const sourceId = await upsertSource(source.slug, source.name);
      const jobs = await source.fetch();
      const inserted = await saveJobs(sourceId, jobs);
      log.info({ fetched: jobs.length, inserted }, 'coleta concluída');
    } catch (err) {
      log.error({ err }, 'falha na coleta da fonte');
    }
  }
}

try {
  await main();
} catch (err) {
  logger.error({ err }, 'erro fatal na coleta');
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
