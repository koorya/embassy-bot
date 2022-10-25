import { MessageController } from '../db_controllers/MessageController';
import { UserController } from '../db_controllers/UserController';
import { EmbassyWorkerCreator, ResType } from '../embassy_worker/EmbassyWorker';
import { scrapLog } from '../loggers/logger';
import { Monitor } from './Monitor';
import { Registrator } from './Registrator';

export class MonitorLogic {
  private _messageController: MessageController;
  private _registrator: Registrator;

  constructor(messageController: MessageController, registrator: Registrator) {
    this._messageController = messageController;
    this._registrator = registrator;
  }

  async run(signal: AbortSignal) {
    const mon = new Monitor();

    let ac = new AbortController();
    const embassyCreator = new EmbassyWorkerCreator();

    mon
      .on('switchOn', () => {
        this._messageController.addMessage(`Появились доступные даты`);
      })
      .on('switchOn', () => {
        ac = new AbortController();
        this._registrator.registerAll(ac.signal);
      })
      .on('switchOff', () => {
        console.log('Stop registration');
        ac.abort();
      })
      .on('switchOff', () => {
        this._messageController.addMessage(`Даты закончились`);
      });

    const embassy_monitor = embassyCreator.createEmbassyMonitor();
    const onAbort = () => {
      clearTimeout(timeout);
    };
    signal.addEventListener('abort', onAbort, { once: true });

    const cycleMonitor = async () => {
      try {
        if (await embassy_monitor.isPossibleToRegister()) {
          mon.setAvailable();
        } else {
          mon.setUnavailable();
        }
        timeout = setTimeout(
          cycleMonitor,
          1000 * parseInt(process.env.EMBASSY_MONITOR_INTERVAL || '60')
        );
      } catch (e) {
        scrapLog.error(e);
        timeout = setTimeout(cycleMonitor, 0);
      }
    };

    let timeout = setTimeout(cycleMonitor, 0);
  }
}
