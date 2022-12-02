import winston from 'winston';
import { EmbassyWorkerCreator } from '../embassy_worker/EmbassyWorker';
import { ScrapeLogger } from '../loggers/logger';
import { Monitor, MonitorProd } from './Monitor';

export interface RegistratorAll {
  registerAll(signal: AbortSignal): Promise<void>;
}
export interface MessegeAdder {
  addMessage(text: string): Promise<void>;
}

interface RegPosibilityChecker {
  isPossibleToRegister(): Promise<boolean>;
}

export abstract class MonitorLogicBase {
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
  abstract createMonitor(): Monitor;
  abstract getRegPossibilityChecker(): RegPosibilityChecker;
  async run(signal: AbortSignal) {
    const mon = this.createMonitor();
    const possibilityChecker = this.getRegPossibilityChecker();

    let ac = new AbortController();

    mon
      .addSwOnListener(() => {
        this._messageAdder.addMessage(`Появились доступные даты`);
      })
      .addSwOnListener(() => {
        ac = new AbortController();
        this._registrator.registerAll(ac.signal);
      })
      .addSwOffListener(() => {
        this._logger.info('Stop registration');
        ac.abort();
      })
      .addSwOffListener(() => {
        this._messageAdder.addMessage(`Даты закончились`);
      });

    const onAbort = () => {
      clearTimeout(timeout);
    };
    signal.addEventListener('abort', onAbort, { once: true });

    const cycleMonitor = async () => {
      try {
        if (await possibilityChecker.isPossibleToRegister()) {
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
export class MonitorLogicProd extends MonitorLogicBase {
  createMonitor(): Monitor {
    return new MonitorProd();
  }
  getRegPossibilityChecker() {
    const embassyCreator = new EmbassyWorkerCreator();
    const possibilityChecker = embassyCreator.createEmbassyMonitor();
    return possibilityChecker;
  }
}
