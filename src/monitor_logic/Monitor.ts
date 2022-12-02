import { EventEmitter } from 'node:events';
import winston from 'winston';
import { ScrapeLogger } from '../loggers/logger';

enum MonitorStates {
  available,
  unavailable,
}
type Listener = Parameters<EventEmitter['on']>[1];

export interface Monitor {
  setAvailable(): void;
  setUnavailable(): void;
  addSwOnListener(l: Listener): Monitor;
  addSwOffListener(l: Listener): Monitor;
}
export class MonitorProd extends EventEmitter implements Monitor {
  private _state: MonitorStates = MonitorStates.unavailable;
  private _logger: winston.Logger;

  constructor() {
    super();

    this._logger = ScrapeLogger.getInstance().child({ service: 'Monitor' });
  }
  setAvailable() {
    this._logger.info('setAvailable');
    if (this._state == MonitorStates.available) return;

    this._state = MonitorStates.available;

    this._logger.info('switchOn emit');
    this.emit('switchOn');
  }
  setUnavailable() {
    this._logger.info('setUnavailable');
    if (this._state == MonitorStates.unavailable) return;
    this._state = MonitorStates.unavailable;

    this._logger.info('switchOff emit');
    this.emit('switchOff');
  }

  addSwOnListener(listener: Listener) {
    return this.on('switchOn', listener);
  }
  addSwOffListener(listener: Listener) {
    return this.on('switchOff', listener);
  }
}
