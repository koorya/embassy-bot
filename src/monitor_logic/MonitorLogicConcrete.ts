import { MonitorLogicBase, Monitor } from './MonitorLogicBase';

export class MonitorLogicConcrete extends MonitorLogicBase {
  constructor(
    private _monitor: Monitor,
    private _possibilityChecker: {
      isPossibleToRegister: () => Promise<boolean>;
    },
    ...props: ConstructorParameters<typeof MonitorLogicBase>
  ) {
    super(...props);
  }
  getMonitor(): Monitor {
    return this._monitor;
  }
  isPossibleToRegister(): Promise<boolean> {
    return this._possibilityChecker.isPossibleToRegister();
  }
}
