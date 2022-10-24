import { Telegraf } from 'telegraf';
import { ChatIdController } from '../db_controllers/ChatIdsController';
import { MessageController } from '../db_controllers/MessageController';
import { botLog, scrapLog } from '../loggers/logger';

export class BotWrapper {
  bot: Telegraf;
  private _chatIdController: ChatIdController;
  private _messageController: MessageController;

  constructor(
    chatIdController: ChatIdController,
    messageController: MessageController
  ) {
    this.bot = new Telegraf(process.env.BOT_TOKEN || '');
    this._chatIdController = chatIdController;
    this._messageController = messageController;
  }
  async run(signal: AbortSignal) {
    const chatIds = await this._chatIdController.getChatIds();

    this.bot.start(async (ctx) => {
      botLog.info(`start on chat id: ${ctx.chat.id}`);
      if (!chatIds.includes(ctx.chat.id)) {
        chatIds.push(ctx.chat.id);
        await this._chatIdController.addId(
          ctx.chat.id,
          ctx.message.from.username || ''
        );
        ctx.reply(
          'Добро пожаловать! Я сообщу вам о появлении доступных дат для получения визы.'
        );
      }
    });

    this.bot.launch();

    const onAbort = () => {
      clearTimeout(cycle_timeout);
      this.bot.stop('SIGINT');
    };
    signal.addEventListener('abort', onAbort, { once: true });
    const messageSender = async () => {
      try {
        await this.sendOut();
        cycle_timeout = setTimeout(
          messageSender,
          1000 * parseInt(process.env.MESSAGE_SENDER_INTERVAL || '1')
        );
      } catch (e) {
        scrapLog.error(e);
        cycle_timeout = setTimeout(messageSender, 0);
      }
    };
    let cycle_timeout = setTimeout(messageSender, 0);
  }

  async sendOut() {
    const chatIds = await this._chatIdController.getChatIds();
    const messages = await this._messageController.getMessagesToSend(
      chatIds.length
    );
    chatIds.forEach((id) => {
      const to_send = messages.filter(
        ({ recipients }) => !recipients.includes(id)
      );
      to_send.map((mess) =>
        this.bot.telegram
          .sendMessage(id, mess.message)
          .then((r) => {
            this._messageController.setAsSended(mess, id);
          })
          .catch(() => botLog.error(`Сообщение не отправлено ${id}`))
      );
    });
  }
}
