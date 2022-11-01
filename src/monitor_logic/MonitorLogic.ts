import winston from 'winston';
import { MessageController } from '../db_controllers/MessageController';
import { EmbassyWorkerCreator, ResType } from '../embassy_worker/EmbassyWorker';
import { scrapLog } from '../loggers/logger';
import { Monitor } from './Monitor';
import { Registrator } from './Registrator';

export class MonitorLogic {
  private _messageController: MessageController;
  private _registrator: Registrator;
  private _logger: winston.Logger;

  constructor(messageController: MessageController, registrator: Registrator) {
    this._messageController = messageController;
    this._registrator = registrator;

    this._logger = scrapLog.child({ service: 'MonitorLogic' });
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
        this._logger.info('Stop registration');
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
        this._logger.error(e);
        timeout = setTimeout(cycleMonitor, 0);
      }
    };

    let timeout = setTimeout(cycleMonitor, 0);
  }
}
