import { MessageController } from './db_controllers/MessageController';
import { ChatIdController } from './db_controllers/ChatIdsController';
import { BotWrapper } from './bot/BotWrapper';
import { DBCreator } from './db_controllers/db';
import { MonitorLogicConcrete } from './monitor_logic/MonitorLogic';
import { UserController } from './db_controllers/UserController';
import { Registrator } from './monitor_logic/Registrator';
import { ProxyController } from './db_controllers/ProxyController';
import { EmbassyWorkerCreator } from './embassy_worker/EmbassyWorker';
import { MonitorProd } from './monitor_logic/Monitor';

const main = async () => {
  const ac = new AbortController();

  const db = new DBCreator().create();

  const chatIdController = new ChatIdController(db);
  const messageController = new MessageController(db);
  const userController = new UserController(db);
  const proxyController = new ProxyController(db);

  const embassyWorkerCreator = new EmbassyWorkerCreator(!!process.env.DEV_MODE);

  const registrator = new Registrator(
    userController,
    messageController,
    proxyController,
    embassyWorkerCreator
  );
  const bot = new BotWrapper(
    chatIdController,
    messageController,
    userController,
    proxyController
  );

  bot.run(ac.signal);

  const monitor = new MonitorLogicConcrete(
    new MonitorProd(),
    new EmbassyWorkerCreator(false).createEmbassyMonitor(),

    messageController,
    registrator,
    1000 * parseInt(process.env.EMBASSY_MONITOR_INTERVAL || '60')
  );
  monitor.run(ac.signal);

  // Enable graceful stop
  process.once('SIGINT', () => ac.abort('SIGINT'));
  process.once('SIGTERM', () => ac.abort('SIGTERM'));
};
main();
