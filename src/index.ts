import { botLog, scrapLog } from './loggers/logger';
import { Telegraf } from 'telegraf';
import { Monitor } from './Monitor';
import { MongoClient } from 'mongodb';
import { EmbassyRequester } from './requester/EmbassyRequester';
import { userData } from './const';

const MONGO_USER = process.env.MONGO_USER;
const MONGO_PASSWORD = process.env.MONGO_PASSWORD;
const MONGO_HOST = process.env.MONGO_HOST;
const MONGO_PORT = process.env.MONGO_PORT;

const main = async () => {
  const uri = `mongodb://${MONGO_USER}:${MONGO_PASSWORD}@${MONGO_HOST}:${MONGO_PORT}`;
  const client = new MongoClient(uri);
  const db = client.db('botSubscribers');
  const collection = db.collection('chatId');
  // await collection.drop();
  const chatIds: number[] = (await collection.find().toArray()).map(
    ({ chatId }) => chatId
  );

  const bot = new Telegraf(process.env.BOT_TOKEN || '');

  bot.start(async (ctx) => {
    botLog.info(`start on chat id: ${ctx.chat.id}`);
    if (!chatIds.includes(ctx.chat.id)) {
      chatIds.push(ctx.chat.id);
      await collection.insertOne({
        chatId: ctx.chat.id,
        username: ctx.message.from.username,
      });
      ctx.reply(
        'Добро пожаловать! Я сообщу вам о появлении доступных дат для получения визы.'
      );
    }
  });

  bot.launch();

  const mon = new Monitor(
    () =>
      chatIds.forEach((id) =>
        bot.telegram
          .sendMessage(id, 'Появились доступные даты')
          .catch(() => botLog.error(`Сообщение не отправлено ${id}`))
      ),
    () =>
      chatIds.forEach((id) =>
        bot.telegram
          .sendMessage(id, 'Даты закончились')
          .catch(() => botLog.error(`Сообщение не отправлено ${id}`))
      )
  );

  let timeout;
  const requester = new EmbassyRequester(userData());
  const cycle = async () => {
    try {
      if (await requester.checkDates()) {
        mon.setAvailable();
      } else {
        mon.setUnavailable();
      }
      timeout = setTimeout(cycle, 1000 * 60);
    } catch (e) {
      scrapLog.error(e);
      timeout = setTimeout(cycle, 0);
    }
  };

  cycle();

  // Enable graceful stop
  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));
};
main();
