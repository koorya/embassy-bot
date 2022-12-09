import { MonitorConcrete } from './Monitor';
import { MonitorLogicConcrete } from './MonitorLogicConcrete';

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

describe('MonitorLogic', () => {
  const adder = jest.fn();
  const reg = jest.fn();
  beforeEach(() => {
    adder.mockReset();
    reg.mockReset();
    mock_info.mockReset();
    mock_error.mockReset();
  });
  it(`При появлени дат в промежуток времени. 
  Сигнал сбрасывается сильно после прохождения замоканных значений. `, async () => {
    const ac = new AbortController();

    const mon = new MonitorLogicConcrete(
      {
        isPossibleToRegister: jest
          .fn()
          .mockResolvedValueOnce(false)
          .mockResolvedValueOnce(false)
          .mockResolvedValueOnce(true)
          .mockResolvedValueOnce(true)
          .mockResolvedValueOnce(true)
          .mockResolvedValueOnce(true)
          .mockResolvedValue(false),
      },
      { addMessage: adder },
      { registerAll: reg },
      new MonitorConcrete(),
      25
    );

    setTimeout(() => ac.abort(), 25 * 20);
    const worker = mon.run(ac.signal);

    await new Promise<void>((r) => setTimeout(r, 25 * 10));

    // `Должны появиться строго два сообщения в эмитер сообщений`
    expect(adder.mock.calls.length).toBe(2);
    expect(adder.mock.calls[0][0]).toBe('Появились доступные даты');
    expect(adder.mock.calls[1][0]).toBe('Даты закончились');

    // `В логгере должны отражены правильные вызовы событий монитора`
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

    // `Метод регистрации должен быть вызван один раз`
    expect(reg).toBeCalledTimes(1);

    const reg_signal: AbortSignal = reg.mock.calls[0][0];
    // `Сигнал для отмены регистрации должен сработать после того, как даты закончились`
    expect(reg_signal.aborted).toBe(true);
    await worker;
  });

  it('should abort only end', async () => {
    const ac = new AbortController();

    const mon = new MonitorLogicConcrete(
      {
        isPossibleToRegister: jest
          .fn()
          .mockResolvedValueOnce(false)
          .mockResolvedValueOnce(false)
          .mockResolvedValueOnce(true)
          .mockResolvedValue(true),
      },
      { addMessage: adder },
      { registerAll: reg },
      new MonitorConcrete(),
      25
    );

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

    const mon = new MonitorLogicConcrete(
      {
        isPossibleToRegister: jest
          .fn()
          .mockResolvedValueOnce(false)
          .mockResolvedValue(false),
      },
      { addMessage: adder },
      { registerAll: reg },
      new MonitorConcrete(),
      25
    );
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
    const mon = new MonitorLogicConcrete(
      {
        isPossibleToRegister: jest
          .fn()
          .mockResolvedValueOnce(false)
          .mockResolvedValueOnce(false)
          .mockResolvedValueOnce(false)
          .mockRejectedValueOnce("Error, can't check. Site unavailable")
          .mockResolvedValueOnce(true)

          .mockResolvedValue(false),
      },
      { addMessage: adder },
      { registerAll: reg },
      new MonitorConcrete(),
      25
    );

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
    const reg = jest
      .fn(() => Promise.resolve())
      .mockRejectedValueOnce('Error, could not register')
      .mockRejectedValueOnce('Error, could not register')
      .mockRejectedValueOnce('Error, could not register')
      .mockRejectedValueOnce('Error, could not register');

    const mon = new MonitorLogicConcrete(
      {
        isPossibleToRegister: jest
          .fn()
          .mockResolvedValueOnce(false)
          .mockResolvedValueOnce(false)
          .mockResolvedValueOnce(false)
          .mockResolvedValueOnce(true)
          .mockResolvedValueOnce(true)
          .mockResolvedValueOnce(true)

          .mockResolvedValue(false),
      },
      { addMessage: adder },
      { registerAll: reg },
      new MonitorConcrete(),
      25
    );
    setTimeout(() => ac.abort(), 25 * 20);

    const worker = mon.run(ac.signal);
    await new Promise<void>((r) => setTimeout(r, 25 * 10));
    expect(adder.mock.calls.length).toBe(2);
    expect(adder.mock.calls[0][0]).toBe('Появились доступные даты');
    expect(adder.mock.calls[1][0]).toBe('Даты закончились');
    expect(mock_info.mock.calls.length).toBeGreaterThanOrEqual(10);
    expect(mock_error.mock.calls[0][0]).toBe('Error, could not register');

    expect(reg).toBeCalledTimes(5);
    await worker;
  });

  it('registerAll exceed fault limit', async () => {
    const ac = new AbortController();
    const reg = jest.fn().mockRejectedValue('Error, could not register');

    const mon = new MonitorLogicConcrete(
      {
        isPossibleToRegister: jest
          .fn()
          .mockResolvedValueOnce(false)
          .mockResolvedValueOnce(false)
          .mockResolvedValueOnce(false)
          .mockResolvedValueOnce(true)
          .mockResolvedValueOnce(true)
          .mockResolvedValueOnce(true)

          .mockResolvedValue(false),
      },
      { addMessage: adder },
      { registerAll: reg },
      new MonitorConcrete(),
      25
    );
    setTimeout(() => ac.abort(), 25 * 20);

    const worker = mon.run(ac.signal);
    await new Promise<void>((r) => setTimeout(r, 25 * 10));
    expect(adder.mock.calls.length).toBe(2);
    expect(adder.mock.calls[0][0]).toBe('Появились доступные даты');
    expect(adder.mock.calls[1][0]).toBe('Даты закончились');
    expect(mock_info.mock.calls.length).toBeGreaterThanOrEqual(10);

    expect(mock_error.mock.calls.length).toBeGreaterThanOrEqual(20);

    expect(mock_error.mock.calls[0][0]).toBe('Error, could not register');

    expect(mock_error.mock.calls[20][0]).toBe('Error, could not register');
    expect(reg).toBeCalledTimes(21);
    await worker;
  });
});
