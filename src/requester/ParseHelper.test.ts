import { HarAdapter } from '../har_adapter/HarAdapter';
import { ParseHelper } from './ParseHelper';

const harAdapter = new HarAdapter();
beforeAll(() => {
  return harAdapter.readFile();
});
describe('parse hepler', () => {
  let responseText: string;
  let responseCookie: string;
  beforeAll(() => {
    responseText = harAdapter.getResponseText(harAdapter.getEntity());

    responseCookie = harAdapter.getResponseCookie(harAdapter.getEntity());
  });

  const parseHelper = new ParseHelper();

  it('invalid string returned null', () => {
    expect(parseHelper.parseStepCode('')).toBe(null);
  });
  it('parsed text should', () => {
    expect(parseHelper.parseStepCode(responseText)).toBe(
      'Pw109DNiyWXcY-h4m0ItTMTztPaGUb9FIoIzPBOqdy13YD2kZAD6UZ4E2RPsNx0oqIaHndQo1z9twUNvUOUnYA%3D%3D'
    );
  });
  it('parsed cookie should', () => {
    expect(responseCookie).toBe(1);
    expect(parseHelper.parseCookie(responseCookie)).toMatchObject({
      sessionCookie: '',
      schedulerCookie: '',
    });
  });
});
