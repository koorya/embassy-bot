import { HarAdapter } from './HarAdapter';

describe('har arapter', () => {
  const harAdapter = new HarAdapter();
  it('file read success', async () => {
    await harAdapter.readFile();
    expect({ hello: 'world' }).toHaveProperty('hello');
    const har = harAdapter.getHar();
    expect(har).toHaveProperty('log.entries');
    const response = harAdapter.getEntity();
    expect(response).toHaveProperty('response.content.text');
    expect(harAdapter.getResponseText(response).length).toBeGreaterThanOrEqual(
      100
    );
  });
});
