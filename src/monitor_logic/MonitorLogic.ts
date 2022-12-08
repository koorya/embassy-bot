import winston from 'winston';
import { EmbassyChecker } from '../embassy_worker/EmbassyChecker';
import { EmbassyWorkerCreator } from '../embassy_worker/EmbassyWorker';
import { ScrapeLogger } from '../loggers/logger';
import { MonitorProd } from './Monitor';
import { Listener } from './types';
export interface RegistratorAll {
  registerAll(signal: AbortSignal): Promise<void>;
}
export interface MessegeAdder {
  addMessage(text: string): Promise<void>;
}

interface RegPosibilityChecker {
  isPossibleToRegister(): Promise<boolean>;
}

export interface Monitor {
  setAvailable(): void;
  setUnavailable(): void;
  addSwOnListener(l: Listener): Monitor;
  addSwOffListener(l: Listener): Monitor;
}

export abstract class MonitorLogicBase {
  private _messageAdder: MessegeAdder;
  private _registrator: RegistratorAll;
  private _logger: winston.Logger;
  private _interval_ms: number;

  constructor(
    messageAdder: MessegeAdder,
    registrator: RegistratorAll,
    interval_ms: number
  ) {
    this._messageAdder = messageAdder;
    this._registrator = registrator;

    this._logger = ScrapeLogger.getInstance().child({
      service: 'MonitorLogic',
    });
    this._interval_ms = interval_ms;
  }
  abstract createMonitor(): Monitor;
  abstract getRegPossibilityChecker(): RegPosibilityChecker;
  async run(signal: AbortSignal) {
    const mon = this.createMonitor();
    const possibilityChecker = this.getRegPossibilityChecker();

    const ac: AbortController[] = [];
    let registrator_number = 0;
    const registerAll = () => {
      if (registrator_number > 20) {
        this._logger.error('To try to register too many times');
        return;
      }
      const n = ac.push(new AbortController()) - 1;
      registrator_number++;
      this._registrator
        .registerAll(ac[n].signal)
        .then(() => registrator_number--)
        .catch((e) => {
          this._logger.error(e);
          ac.pop()?.abort;
          registerAll();
        });
    };
    mon
      .addSwOnListener(() => {
        this._messageAdder.addMessage(`Появились доступные даты`);
      })
      .addSwOnListener(registerAll)
      .addSwOffListener(() => {
        this._logger.info('Stop registration');

        ac.pop()?.abort();
      })
      .addSwOffListener(() => {
        this._messageAdder.addMessage(`Даты закончились`);
      });
    return new Promise<void>((resolve) => {
      const onAbort = () => {
        clearTimeout(timeout);
        ac.forEach((ac) => ac.abort());
        resolve();
      };
      signal.addEventListener('abort', onAbort, { once: true });

      const cycleMonitor = async () => {
        try {
          if (await possibilityChecker.isPossibleToRegister()) {
            mon.setAvailable();
          } else {
            mon.setUnavailable();
          }
          timeout = setTimeout(cycleMonitor, this._interval_ms);
        } catch (e) {
          this._logger.error(e);
          timeout = setTimeout(cycleMonitor, 0);
        }
      };

      let timeout = setTimeout(cycleMonitor, 0);
    });
  }
}

export interface EmbassyMonitorCreator {
  createEmbassyMonitor(): EmbassyChecker;
}

export class MonitorLogicProd extends MonitorLogicBase {
  createMonitor(): Monitor {
    return new MonitorProd();
  }
  getRegPossibilityChecker() {
    const embassyCreator: EmbassyMonitorCreator = new EmbassyWorkerCreator(
      false
    );
    const possibilityChecker = embassyCreator.createEmbassyMonitor();
    return possibilityChecker;
  }
}
