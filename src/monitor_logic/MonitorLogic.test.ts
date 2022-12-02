import { MonitorProd } from './Monitor';
import { MonitorLogicBase } from './MonitorLogic';

const mock_info = jest.fn();
const mock_error = jest.fn();

jest.mock('../loggers/logger', () => {
  return {
    __esModule: true,
    ScrapeLogger: {
      getInstance: jest.fn().mockReturnThis(),
      child: ({ service }: { service: string }) => ({
        info: (m: string) => mock_info(m, service),
        error: (m: string) => mock_error(m, service),
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
      isPossibleToRegister: jest.fn().mockResolvedValue(false),
    };
  }
}
describe('MonitorLogic', () => {
  const adder = jest.fn();
  const reg = jest.fn();
  beforeEach(() => {
    adder.mockReset();
    reg.mockReset();
    mock_info.mockReset();
    mock_error.mockReset();
  });
  it('date availabe swith on and off, abort reg, when off', async () => {
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
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(true)
        .mockResolvedValue(false),
    });
    setTimeout(() => ac.abort(), 25 * 20);
    const worker = mon.run(ac.signal);
    await new Promise<void>((r) => setTimeout(r, 25 * 10));
    expect(adder.mock.calls.length).toBe(2);
    expect(adder.mock.calls[0][0]).toBe('Появились доступные даты');
    expect(adder.mock.calls[1][0]).toBe('Даты закончились');
    expect(mock_info.mock.calls.length).toBeGreaterThanOrEqual(10);
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

    expect(reg).toBeCalledTimes(1);
    const reg_signal: AbortSignal = reg.mock.calls[0][0];
    expect(reg_signal.aborted).toBe(true);
    await worker;
  });

  it('should abort only end', async () => {
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

    const worker = mon.run(ac.signal);
    await new Promise<void>((r) => setTimeout(r, 25 * 10));
    expect(adder.mock.calls.length).toBe(1);
    expect(adder.mock.calls[0][0]).toBe('Появились доступные даты');
    expect(mock_info.mock.calls.length).toBeGreaterThanOrEqual(10);
    expect(reg).toBeCalledTimes(1);
    const reg_signal: AbortSignal = reg.mock.calls[0][0];
    expect(reg_signal.aborted).toBe(false);
    await worker;
    expect(reg_signal.aborted).toBe(true);
  });

  it('should not reg cause not possible', async () => {
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

    const worker = mon.run(ac.signal);
    await new Promise<void>((r) => setTimeout(r, 25 * 10));
    expect(adder.mock.calls.length).toBe(0);
    expect(mock_info.mock.calls.length).toBeGreaterThanOrEqual(10);
    expect(reg).toBeCalledTimes(0);
    await worker;
  });

  it('possibility checker fault', async () => {
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
        .mockResolvedValueOnce(false)
        .mockRejectedValueOnce("Error, can't check. Site unavailable")
        .mockResolvedValueOnce(true)

        .mockResolvedValue(false),
    });
    setTimeout(() => ac.abort(), 25 * 20);

    const worker = mon.run(ac.signal);
    await new Promise<void>((r) => setTimeout(r, 25 * 10));
    expect(adder.mock.calls.length).toBe(2);
    expect(adder.mock.calls[0][0]).toBe('Появились доступные даты');
    expect(adder.mock.calls[1][0]).toBe('Даты закончились');
    expect(mock_info.mock.calls.length).toBeGreaterThanOrEqual(10);
    expect(mock_error.mock.calls[0][0]).toBe(
      "Error, can't check. Site unavailable"
    );
    expect(reg).toBeCalledTimes(1);
    await worker;
  });

  it('registerAll fault', async () => {
    const ac = new AbortController();
    const reg = jest.fn().mockRejectedValue('Error, could not register');
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
        .mockResolvedValueOnce(false)
        // .mockRejectedValueOnce("Error, can't check. Site unavailable")
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(true)

        .mockResolvedValue(false),
    });
    setTimeout(() => ac.abort(), 25 * 20);

    const worker = mon.run(ac.signal);
    await new Promise<void>((r) => setTimeout(r, 25 * 10));
    expect(adder.mock.calls.length).toBe(2);
    expect(adder.mock.calls[0][0]).toBe('Появились доступные даты');
    expect(adder.mock.calls[1][0]).toBe('Даты закончились');
    expect(mock_info.mock.calls.length).toBeGreaterThanOrEqual(10);
    expect(mock_error.mock.calls[0][0]).toBe(
      "Error, can't check. Site unavailable"
    );
    expect(reg).toBeCalledTimes(1);
    await worker;
  });
});
