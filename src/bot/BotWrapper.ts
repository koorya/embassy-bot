import { Markup, Telegraf } from 'telegraf';
import { ChatIdController } from '../db_controllers/ChatIdsController';
import { MessageController } from '../db_controllers/MessageController';
import { botLog, scrapLog } from '../loggers/logger';
import { UserData } from '../requester/EmbassyRequester';
import { State } from './DialogController/States';
import { EnterFirstName, EnterServiceId } from './DialogController/AddUser';
import { UserController } from '../db_controllers/UserController';
import { ObjectId } from 'mongodb';

export class BotWrapper {
  bot: Telegraf;
  private _chatIdController: ChatIdController;
  private _messageController: MessageController;
  private _userController: UserController;

  constructor(
    chatIdController: ChatIdController,
    messageController: MessageController,
    userController: UserController
  ) {
    this.bot = new Telegraf(process.env.BOT_TOKEN || '');
    this._chatIdController = chatIdController;
    this._messageController = messageController;
    this._userController = userController;
  }
  configureBot() {
    const bot = this.bot;

    const mainMenu = Markup.keyboard(
      ['/add_user', '/list_reg', '/list_notreg', '/list_all'],
      { columns: 3 }
    ).resize();

    bot.start(async (ctx) => {
      const chatIds = await this._chatIdController.getChatIds();
      botLog.info(`start on chat id: ${ctx.chat.id}`);
      if (!chatIds.includes(ctx.chat.id)) {
        chatIds.push(ctx.chat.id);
        await this._chatIdController.addId(
          ctx.chat.id,
          ctx.message.from.username || ''
        );
        ctx.reply(
          'Добро пожаловать! Я сообщу вам о появлении доступных дат для получения визы.',
          mainMenu
        );
      } else {
        ctx.reply('menu', mainMenu);
      }
    });

    const currentState = new Map<number, State>();
    bot.hears('/add_user', (ctx) => {
      // ctx.reply('Добавление пользователя');
      currentState.set(
        ctx.chat.id,
        new EnterServiceId(
          { chatId: ctx.chat.id, bot, userController: this._userController },
          {}
        )
      );
      currentState.get(ctx.chat.id)?.ask();
    });

    bot.hears(/\/list_((?:reg)|(?:notreg)|(?:all))/, async (ctx) => {
      const cmd = ctx.match[1] as 'reg' | 'notreg';
      await ctx.reply('Пользователи в базе');
      const users =
        cmd == 'reg'
          ? await this._userController.listRegistered()
          : cmd == 'notreg'
          ? await this._userController.listNotRegistered()
          : cmd == 'all'
          ? await this._userController.listAll()
          : [];
      users.map(
        ({
          _id,
          email,
          firstName,
          lastName,
          notes,
          phone,
          serviceIds,
          ...ext
        }) =>
          ctx.telegram.sendMessage(
            ctx.chat.id,
            `${firstName} ${lastName} ${phone} ${email} ${notes} ${serviceIds} ${
              ext.isRegistered ? 'зарегистрирован на ' + ext.date : 'в очереди'
            }`,
            Markup.inlineKeyboard([
              Markup.button.callback('Удалить', `remove-user-${_id}`),
            ])
          )
      );
    });
    bot.action(/remove-user-(.*)/, async (ctx) => {
      // ctx.reply(ctx.match[0]);
      if (!ctx.chat) return;
      ctx.answerCbQuery();
      this._userController.removeUser({ _id: new ObjectId(ctx.match[1]) });
    });
    bot.on('text', async (ctx) => {
      const new_state = await currentState
        .get(ctx.chat.id)
        ?.hanlde(ctx.message.text);
      if (new_state) currentState.set(ctx.chat.id, new_state);
      currentState.get(ctx.chat.id)?.ask();
    });
    bot.action(/register-user-serviceid-(.*)/, async (ctx) => {
      // ctx.reply(ctx.match[0]);
      if (!ctx.chat) return;
      ctx.answerCbQuery();
      const new_state = await currentState
        .get(ctx.chat.id)
        ?.hanlde(ctx.match[1]);
      if (new_state) currentState.set(ctx.chat.id, new_state);
      currentState.get(ctx.chat.id)?.ask();
    });
  }

  async run(signal: AbortSignal) {
    this.configureBot();
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
