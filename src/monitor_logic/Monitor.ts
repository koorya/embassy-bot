import { EventEmitter } from 'node:events';

enum MonitorStates {
  available,
  unavailable,
}
export class Monitor extends EventEmitter {
  private _state: MonitorStates = MonitorStates.unavailable;

  setAvailable() {
    console.log('setAvailable');
    if (this._state == MonitorStates.available) return;

    this._state = MonitorStates.available;

    console.log('switchOn emit');
    this.emit('switchOn');
  }
  setUnavailable() {
    console.log('setUnavailable');
    if (this._state == MonitorStates.unavailable) return;
    this._state = MonitorStates.unavailable;

    console.log('switchOff emit');
    this.emit('switchOff');
  }
}
