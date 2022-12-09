import { AppFacade } from './AppFacade';

const main = async () => {
  const ac = new AbortController();

  new AppFacade(
    !!process.env.DEV_MODE,
    process.env.BOT_TOKEN || '',
    1000 * parseInt(process.env.EMBASSY_MONITOR_INTERVAL || '60')
  ).run(ac);

  // Enable graceful stop
  process.once('SIGINT', () => ac.abort('SIGINT'));
  process.once('SIGTERM', () => ac.abort('SIGTERM'));
};
main();
