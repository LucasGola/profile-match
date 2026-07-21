import { logger } from '../logger.js';
import { collectionQueue } from '../queue/queues.js';
import { enqueueCollection } from '../queue/producer.js';

/**
 * Dispara uma coleta: enfileira 1 job por fonte na fila de coleta.
 *
 * O processamento em si acontece no worker (`npm run worker`), que consome
 * a fila. Este comando apenas produz os jobs e encerra.
 */
async function main(): Promise<void> {
  const ids = await enqueueCollection();
  logger.info({ jobs: ids }, 'jobs de coleta enfileirados');
}

const exitCode = await main()
  .then(() => 0)
  .catch((err: unknown) => {
    logger.error({ err }, 'falha ao enfileirar a coleta');
    return 1;
  });

// close() libera a conexão; exit() garante o término (BullMQ mantém o loop vivo).
await collectionQueue.close();
process.exit(exitCode);
