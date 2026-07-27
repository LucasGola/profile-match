import { Worker } from 'bullmq';
import { prisma } from '../db/client.js';
import { logger } from '../logger.js';
import { processCollectionJob } from './collection.processor.js';
import { createRedisConnection } from './connection.js';
import { COLLECTION_QUEUE, type CollectionJobData } from './queues.js';
import { getCollectionIntervalMs, registerCollectionSchedulers } from './scheduler.js';

const CONCURRENCY = Number(process.env['WORKER_CONCURRENCY'] ?? '3');

const worker = new Worker<CollectionJobData>(COLLECTION_QUEUE, processCollectionJob, {
  connection: createRedisConnection(),
  concurrency: CONCURRENCY,
});

worker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, source: job?.data.sourceSlug, err }, 'job de coleta falhou');
});

worker.on('error', (err) => {
  logger.error({ err }, 'erro no worker');
});

logger.info({ queue: COLLECTION_QUEUE, concurrency: CONCURRENCY }, 'worker de coleta iniciado');

// Registra os agendamentos periódicos (idempotente) ao subir o worker.
registerCollectionSchedulers()
  .then(() => {
    logger.info({ intervalMs: getCollectionIntervalMs() }, 'agendamento de coleta registrado');
  })
  .catch((err: unknown) => {
    logger.error({ err }, 'falha ao registrar agendamento de coleta');
  });

// Encerramento gracioso: fecha o worker e a conexão do banco.
async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, 'encerrando worker');
  await worker.close();
  await prisma.$disconnect();
  process.exit(0);
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
