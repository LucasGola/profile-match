import { Bot } from 'grammy';
import { logger } from '../logger.js';

/** Canal de notificação. */
export interface Notifier {
  send(text: string): Promise<void>;
}

/** Notifica via Telegram (grammY). */
class TelegramNotifier implements Notifier {
  private readonly bot: Bot;

  constructor(
    token: string,
    private readonly chatId: string,
  ) {
    this.bot = new Bot(token);
  }

  async send(text: string): Promise<void> {
    await this.bot.api.sendMessage(this.chatId, text);
  }
}

/** Fallback: apenas registra a notificação no log (Telegram não configurado). */
class LogNotifier implements Notifier {
  send(text: string): Promise<void> {
    logger.info({ notification: text }, 'notificação (somente log)');
    return Promise.resolve();
  }
}

/**
 * Cria o notifier conforme a configuração: Telegram se houver
 * TELEGRAM_BOT_TOKEN e TELEGRAM_CHAT_ID; caso contrário, apenas log.
 */
export function createNotifier(): Notifier {
  const token = process.env['TELEGRAM_BOT_TOKEN'];
  const chatId = process.env['TELEGRAM_CHAT_ID'];

  if (token && chatId) {
    return new TelegramNotifier(token, chatId);
  }

  logger.warn('Telegram não configurado; notificações apenas em log');
  return new LogNotifier();
}
