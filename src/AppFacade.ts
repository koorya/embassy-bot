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
import { Db } from 'mongodb';

type Controllers = {
  chatIdController: ChatIdController;
  messageController: MessageController;
  userController: UserController;
  proxyController: ProxyController;
};

export class AppFacade {
  constructor(
    private _isDevMode: boolean,
    private _botToken: string,
    private _monitor_interval_ms: number
  ) {}
  run(ac: AbortController) {
    const db = AppFacade._createDBConnection();
    const controllers = AppFacade._createBDControllers(db);

    this._runTelegramBot(controllers, ac);

    this._runMonitor(controllers, ac);
  }

  private static _createDBConnection() {
    return new DBCreator().create();
  }
  private static _createBDControllers(db: Db) {
    return {
      chatIdController: new ChatIdController(db),
      messageController: new MessageController(db),
      userController: new UserController(db),
      proxyController: new ProxyController(db),
    };
  }
  private _runTelegramBot(ctrl: Controllers, ac: AbortController) {
    new BotWrapper(ctrl, this._botToken).run(ac.signal);
  }

  private _runMonitor(ctrl: Controllers, ac: AbortController) {
    new MonitorLogicConcrete(
      new MonitorProd(),
      new EmbassyWorkerCreator(this._isDevMode).createEmbassyMonitor(),
      ctrl.messageController,
      this._createRegistrator(ctrl),
      this._monitor_interval_ms
    ).run(ac.signal);
  }

  private _createRegistrator(ctrl: Controllers) {
    return new Registrator(
      ctrl.userController,
      ctrl.messageController,
      ctrl.proxyController,
      new EmbassyWorkerCreator(this._isDevMode)
    );
  }
}
