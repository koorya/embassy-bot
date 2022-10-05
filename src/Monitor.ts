enum MonitorStates {
  available,
  unavailable,
}
export class Monitor {
  private _state: MonitorStates = MonitorStates.unavailable;
  private _on = () => {};
  private _off = () => {};

  constructor(on: () => void, off: () => void) {
    this._on = on;
    this._off = off;
  }
  setAvailable() {
    if (this._state == MonitorStates.available) return;
    this._state = MonitorStates.available;
    this._on();
  }
  setUnavailable() {
    if (this._state == MonitorStates.unavailable) return;
    this._state = MonitorStates.unavailable;
    this._off();
  }
}
