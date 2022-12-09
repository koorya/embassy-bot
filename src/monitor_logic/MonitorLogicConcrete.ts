import { MonitorLogicBase, Monitor } from './MonitorLogicBase';

export class MonitorLogicConcrete extends MonitorLogicBase {
  constructor(
    private _possibilityChecker: {
      isPossibleToRegister: () => Promise<boolean>;
    },
    ...props: ConstructorParameters<typeof MonitorLogicBase>
  ) {
    super(...props);
  }

  isPossibleToRegister(): Promise<boolean> {
    return this._possibilityChecker.isPossibleToRegister();
  }
}
