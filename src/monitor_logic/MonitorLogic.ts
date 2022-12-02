import winston from 'winston';
import { EmbassyWorkerCreator } from '../embassy_worker/EmbassyWorker';
import { ScrapeLogger } from '../loggers/logger';
import { Monitor } from './Monitor';

export interface RegistratorAll {
  registerAll(signal: AbortSignal): Promise<void>;
}
export interface MessegeAdder {
  addMessage(text: string): Promise<void>;
}

export class MonitorLogic {
  private _messageAdder: MessegeAdder;
  private _registrator: RegistratorAll;
  private _logger: winston.Logger;

  constructor(messageAdder: MessegeAdder, registrator: RegistratorAll) {
    this._messageAdder = messageAdder;
    this._registrator = registrator;

    this._logger = ScrapeLogger.getInstance().child({
      service: 'MonitorLogic',
    });
  }

  async run(signal: AbortSignal) {
    const mon = new Monitor();

    let ac = new AbortController();
    const embassyCreator = new EmbassyWorkerCreator();

    mon
      .on('switchOn', () => {
        this._messageAdder.addMessage(`Появились доступные даты`);
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
        this._messageAdder.addMessage(`Даты закончились`);
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
