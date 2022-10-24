import { botLog, scrapLog } from './loggers/logger';
import { ServiceIds } from './requester/EmbassyRequester';
import { userData } from './const';
import { EmbassyWorkerCreator, ResType } from './embassy_worker/EmbassyWorker';
import { MessageController } from './db_controllers/MessageController';
import { ChatIdController } from './db_controllers/ChatIdsController';
import { BotWrapper } from './bot/BotWrapper';
import { DBCreator } from './db_controllers/db';
import { MonitorLogic } from './monitor_logic/MonitorLogic';

const main = async () => {
  const ac = new AbortController();

  const db = new DBCreator().create();

  const chatIdController = new ChatIdController(db);
  const messageController = new MessageController(db);
  const bot = new BotWrapper(chatIdController, messageController);

  bot.run(ac.signal);

  const monitor = new MonitorLogic(messageController);
  monitor.run(ac.signal);

  // Enable graceful stop
  process.once('SIGINT', () => ac.abort('SIGINT'));
  process.once('SIGTERM', () => ac.abort('SIGTERM'));
};
main();
