import { MonitorProd } from './Monitor';
import { Monitor } from './MonitorLogicBase';

const mock_info = jest.fn();

jest.mock('../loggers/logger', () => {
  return {
    __esModule: true,
    ScrapeLogger: {
      getInstance: jest.fn().mockReturnThis(),
      child: () => ({ info: mock_info }),
    },
  };
});

describe('Monitor', () => {
  it('on off', () => {
    mock_info.mockReset();
    const mon: Monitor = new MonitorProd();
    const mock = {
      swOn1: jest.fn(),
      swOn2: jest.fn(),
      swOff1: jest.fn(),
      swOff2: jest.fn(),
    };
    mon
      .addSwOnListener(mock.swOn1)
      .addSwOnListener(mock.swOn2)
      .addSwOffListener(mock.swOff1)
      .addSwOffListener(mock.swOff2);
    expect(mock.swOn1.mock.calls.length).toBe(0);
    expect(mock.swOn2.mock.calls.length).toBe(0);
    expect(mock.swOff1.mock.calls.length).toBe(0);
    expect(mock.swOff2.mock.calls.length).toBe(0);
    expect(mock_info.mock.calls.length).toBe(0);

    mock_info.mockReset();
    mon.setAvailable();
    expect(mock_info.mock.calls.length).toBe(2);
    expect(mock_info.mock.calls[0][0]).toBe('setAvailable');
    expect(mock_info.mock.calls[1][0]).toBe('switchOn emit');
    expect(mock.swOn1.mock.calls.length).toBe(1);
    expect(mock.swOn2.mock.calls.length).toBe(1);
    expect(mock.swOff1.mock.calls.length).toBe(0);
    expect(mock.swOff2.mock.calls.length).toBe(0);

    mock_info.mockReset();
    mon.setUnavailable();
    expect(mock_info.mock.calls.length).toBe(2);
    expect(mock_info.mock.calls[0][0]).toBe('setUnavailable');
    expect(mock_info.mock.calls[1][0]).toBe('switchOff emit');

    expect(mock.swOn1.mock.calls.length).toBe(1);
    expect(mock.swOn2.mock.calls.length).toBe(1);
    expect(mock.swOff1.mock.calls.length).toBe(1);
    expect(mock.swOff2.mock.calls.length).toBe(1);
  });

  it('multiple on/off', () => {
    const mon: Monitor = new MonitorProd();
    // mon.
    const mock = {
      swOn1: jest.fn(),
      swOff1: jest.fn(),
    };
    mon.addSwOnListener(mock.swOn1).addSwOffListener(mock.swOff1);

    mock_info.mockReset();
    expect(mock.swOn1.mock.calls.length).toBe(0);
    expect(mock.swOff1.mock.calls.length).toBe(0);
    mon.setAvailable();
    mon.setAvailable();
    mon.setAvailable();
    mon.setAvailable();
    expect(mock_info.mock.calls.length).toBe(5);
    expect(mock_info.mock.calls[0][0]).toBe('setAvailable');
    expect(mock_info.mock.calls[1][0]).toBe('switchOn emit');
    expect(mock_info.mock.calls[2][0]).toBe('setAvailable');
    expect(mock_info.mock.calls[2][0]).toBe('setAvailable');
    expect(mock_info.mock.calls[2][0]).toBe('setAvailable');
    expect(mock.swOn1.mock.calls.length).toBe(1);
    expect(mock.swOff1.mock.calls.length).toBe(0);

    mock_info.mockReset();
    mon.setUnavailable();
    expect(mock.swOn1.mock.calls.length).toBe(1);
    expect(mock.swOff1.mock.calls.length).toBe(1);
    mon.setUnavailable();
    mon.setUnavailable();
    expect(mock.swOn1.mock.calls.length).toBe(1);
    expect(mock.swOff1.mock.calls.length).toBe(1);
    expect(mock_info.mock.calls.length).toBe(4);
    expect(mock_info.mock.calls[0][0]).toBe('setUnavailable');
    expect(mock_info.mock.calls[1][0]).toBe('switchOff emit');
    expect(mock_info.mock.calls[2][0]).toBe('setUnavailable');
    expect(mock_info.mock.calls[3][0]).toBe('setUnavailable');
  });
});
