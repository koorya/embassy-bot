import { Monitor, MonitorProd } from './Monitor';
import { MonitorLogicBase } from './MonitorLogic';

class MonitorLogicTest extends MonitorLogicBase {
  createMonitor() {
    return new MonitorProd();
  }
  getRegPossibilityChecker() {
    return { isPossibleToRegister: jest.fn() };
  }
}
describe('MonitorLogic', () => {
  it('', () => {
    const adder = jest.fn();
    const reg = jest.fn();
    const ac = new AbortController();

    const mon = new MonitorLogicTest(
      { addMessage: adder },
      { registerAll: reg }
    );
    mon.run(ac.signal);
    ac.abort();
  });
});
