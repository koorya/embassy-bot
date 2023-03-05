import { MonitorLogicBase, Monitor } from './MonitorLogicBase';

export class MonitorLogicConcrete extends MonitorLogicBase {
  constructor(
    private _possibilityChecker: {
      isPossibleToRegister: () => Promise<boolean>;
    },
    private _messageAdder: {
      addMessage(text: string): Promise<void>;
    },
    private _registrator: {
      registerAll(signal: AbortSignal): Promise<void>;
    },

    ...props: ConstructorParameters<typeof MonitorLogicBase>
  ) {
    super(...props);
  }

  isPossibleToRegister(): Promise<boolean> {
    return this._possibilityChecker.isPossibleToRegister();
  }
  addMessage(text: string): Promise<void> {
    return this._messageAdder.addMessage(text);
  }
  registerAll(signal: AbortSignal): Promise<void> {
    return this._registrator.registerAll(signal);
  }
}
