import { pino } from 'pino';

const isProduction = process.env['NODE_ENV'] === 'production';

/**
 * Logger estruturado da aplicação.
 *
 * - Produção: JSON puro (uma linha por evento), ideal para agregadores de log.
 * - Desenvolvimento: saída formatada e colorida via pino-pretty.
 *
 * Nível controlado por LOG_LEVEL (padrão: "info").
 */
export const logger = pino({
  level: process.env['LOG_LEVEL'] ?? 'info',
  ...(isProduction
    ? {}
    : {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        },
      }),
});
