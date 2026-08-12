import { logger } from '../logger.js';
import { buildApp } from './server.js';

const port = Number(process.env['API_PORT'] ?? '3000');
const app = buildApp();

async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, 'encerrando API');
  await app.close();
  process.exit(0);
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));

try {
  await app.listen({ port, host: '0.0.0.0' });
} catch (err) {
  logger.error({ err }, 'falha ao iniciar a API');
  process.exit(1);
}
