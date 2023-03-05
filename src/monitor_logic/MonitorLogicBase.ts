import winston from 'winston';
import { ScrapeLogger } from '../loggers/logger';
import { Listener } from './types';

export interface Monitor {
  setAvailable(): void;
  setUnavailable(): void;
  addSwOnListener(l: Listener): Monitor;
  addSwOffListener(l: Listener): Monitor;
}

export abstract class MonitorLogicBase {
  // pattern template method
  private _logger: winston.Logger;

  constructor(private _monitor: Monitor, private _interval_ms: number) {
    this._logger = ScrapeLogger.getInstance().child({
      service: 'MonitorLogic',
    });
  }

  abstract isPossibleToRegister(): Promise<boolean>;
  abstract addMessage(text: string): Promise<void>;
  abstract registerAll(signal: AbortSignal): Promise<void>;

  async run(signal: AbortSignal) {
    const mon = this._monitor;

    const ac: AbortController[] = [];
    let registrator_number = 0;
    const registerAll = () => {
      if (registrator_number > 20) {
        this._logger.error('To try to register too many times');
        return;
      }
      const n = ac.push(new AbortController()) - 1;
      registrator_number++;
      this.registerAll(ac[n].signal)
        .then(() => registrator_number--)
        .catch((e) => {
          this._logger.error(e);
          ac.pop()?.abort;
          registerAll();
        });
    };
    mon
      .addSwOnListener(() => {
        this.addMessage(`Появились доступные даты`);
      })
      .addSwOnListener(registerAll)
      .addSwOffListener(() => {
        this._logger.info('Stop registration');

        ac.pop()?.abort();
      })
      .addSwOffListener(() => {
        this.addMessage(`Даты закончились`);
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
          if (await this.isPossibleToRegister()) {
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
