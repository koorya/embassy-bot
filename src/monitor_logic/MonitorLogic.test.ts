import { MonitorProd } from './Monitor';
import { MonitorLogicBase } from './MonitorLogic';

const mock_info = jest.fn();

jest.mock('../loggers/logger', () => {
  return {
    __esModule: true,
    ScrapeLogger: {
      getInstance: jest.fn().mockReturnThis(),
      child: ({ service }: { service: string }) => ({
        info: (m: string) => mock_info(m, service),
      }),
    },
  };
});

class MonitorLogicTest extends MonitorLogicBase {
  createMonitor() {
    return new MonitorProd();
  }
  getRegPossibilityChecker() {
    return {
      isPossibleToRegister: jest
        .fn()
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(true)
        .mockResolvedValue(false),
    };
  }
}
describe('MonitorLogic', () => {
  const adder = jest.fn();
  const reg = jest.fn();
  it('valid log', async () => {
    const ac = new AbortController();
    const mon = new MonitorLogicTest(
      { addMessage: adder },
      { registerAll: reg },
      25
    );
    setTimeout(() => ac.abort(), 25 * 20);
    await mon.run(ac.signal);
    await new Promise<void>((r) => setTimeout(r, 25 * 10));
    expect(adder.mock.calls.length).toBe(2);
    expect(adder.mock.calls[0][0]).toBe('Появились доступные даты');
    expect(adder.mock.calls[1][0]).toBe('Даты закончились');
    expect(mock_info.mock.calls.length).toBeGreaterThan(17);
    let i = 0;
    const m = mock_info.mock.calls;
    expect(m[i++]).toMatchObject(['setUnavailable', 'Monitor']);
    expect(m[i++]).toMatchObject(['setUnavailable', 'Monitor']);
    expect(m[i++]).toMatchObject(['setAvailable', 'Monitor']);
    expect(m[i++]).toMatchObject(['switchOn emit', 'Monitor']);
    expect(m[i++]).toMatchObject(['setAvailable', 'Monitor']);
    expect(m[i++]).toMatchObject(['setAvailable', 'Monitor']);
    expect(m[i++]).toMatchObject(['setAvailable', 'Monitor']);
    expect(m[i++]).toMatchObject(['setUnavailable', 'Monitor']);
    expect(m[i++]).toMatchObject(['switchOff emit', 'Monitor']);
    expect(m[i++]).toMatchObject(['Stop registration', 'MonitorLogic']);
    expect(m[i++]).toMatchObject(['setUnavailable', 'Monitor']);
    expect(m[i++]).toMatchObject(['setUnavailable', 'Monitor']);
    expect(m[i++]).toMatchObject(['setUnavailable', 'Monitor']);
    expect(m[i++]).toMatchObject(['setUnavailable', 'Monitor']);
    expect(m[i++]).toMatchObject(['setUnavailable', 'Monitor']);
    expect(m[i++]).toMatchObject(['setUnavailable', 'Monitor']);
    expect(m[i++]).toMatchObject(['setUnavailable', 'Monitor']);

    expect(reg).toBeCalledTimes(1);
    const reg_signal: AbortSignal = reg.mock.calls[0][0];
    expect(reg_signal.aborted).toBe(true);
  });

  it('should not abort', async () => {
    const ac = new AbortController();

    const mon = new MonitorLogicTest(
      { addMessage: adder },
      { registerAll: reg },
      25
    );
    mon.getRegPossibilityChecker = () => ({
      isPossibleToRegister: jest
        .fn()
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true)
        .mockResolvedValue(true),
    });
    setTimeout(() => ac.abort(), 25 * 20);
    adder.mockReset();
    mock_info.mockReset();
    reg.mockReset();
    await mon.run(ac.signal);
    await new Promise<void>((r) => setTimeout(r, 25 * 10));
    expect(adder.mock.calls.length).toBe(1);
    expect(adder.mock.calls[0][0]).toBe('Появились доступные даты');
    expect(mock_info.mock.calls.length).toBeGreaterThan(17);
    expect(reg).toBeCalledTimes(1);
    const reg_signal: AbortSignal = reg.mock.calls[0][0];
    expect(reg_signal.aborted).toBe(false);
  });

  it('should reg', async () => {
    const ac = new AbortController();

    const mon = new MonitorLogicTest(
      { addMessage: adder },
      { registerAll: reg },
      25
    );
    mon.getRegPossibilityChecker = () => ({
      isPossibleToRegister: jest
        .fn()
        .mockResolvedValueOnce(false)
        .mockResolvedValue(false),
    });
    setTimeout(() => ac.abort(), 25 * 20);
    adder.mockReset();
    mock_info.mockReset();
    reg.mockReset();
    await mon.run(ac.signal);
    await new Promise<void>((r) => setTimeout(r, 25 * 10));
    expect(adder.mock.calls.length).toBe(0);
    expect(mock_info.mock.calls.length).toBeGreaterThan(17);
    expect(reg).toBeCalledTimes(0);
  });
});
