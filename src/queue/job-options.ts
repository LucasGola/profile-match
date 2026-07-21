import type { JobsOptions } from 'bullmq';

/**
 * Política de retry e retenção aplicada aos jobs de coleta.
 *
 * Retry nativo do BullMQ: em caso de falha, o JOB inteiro é reexecutado com
 * backoff exponencial. É seguro porque a coleta é idempotente (upsertSource +
 * saveJobs com skipDuplicates), então repetir o job não gera efeito colateral.
 *
 * Ponto de extensão (paginação / retry por-request): se um dia o fetch de uma
 * fonte precisar paginar ou retentar apenas a requisição que falhou, essa
 * granularidade fina deve ficar DENTRO de `JobSource.fetch()` (ex.: com
 * p-retry), mantendo esta política como rede de segurança externa e durável.
 */
export const COLLECTION_JOB_OPTIONS: JobsOptions = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 1000 },
  // Mantém o Redis enxuto quando a coleta rodar periodicamente (Milestone 4).
  removeOnComplete: { count: 100 },
  removeOnFail: { count: 500 },
};
