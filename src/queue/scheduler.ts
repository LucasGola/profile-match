import { sources } from '../sources/registry.js';
import { collectionQueue, type CollectionJobData } from './queues.js';

const DEFAULT_INTERVAL_MS = 30 * 60 * 1000; // 30 minutos

/**
 * Intervalo entre coletas, em milissegundos.
 * Configurável via COLLECT_INTERVAL_MS; valor inválido cai no padrão.
 */
export function getCollectionIntervalMs(): number {
  const raw = process.env['COLLECT_INTERVAL_MS'];
  const parsed = raw === undefined ? NaN : Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_INTERVAL_MS;
}

/**
 * Registra (idempotente) um job repetível por fonte na fila de coleta.
 *
 * `upsertJobScheduler` cria ou atualiza o agendamento sem duplicar, então pode
 * ser chamado a cada boot do worker. Cada fonte dispara no intervalo e é
 * processada como qualquer job de coleta — sem camada de gatilho/fan-out.
 */
export async function registerCollectionSchedulers(): Promise<void> {
  const every = getCollectionIntervalMs();

  for (const source of sources) {
    await collectionQueue.upsertJobScheduler(
      `collect:${source.slug}`,
      { every },
      { name: 'collect', data: { sourceSlug: source.slug } satisfies CollectionJobData },
    );
  }
}
