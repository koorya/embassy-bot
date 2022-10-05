import { fetchDates } from './fetchDates';
import { logger } from './logger';

let timeout;

const main = async () => {
  try {
    if (await fetchDates()) logger.info('send message');
    timeout = setTimeout(main, 1000 * 60);
  } catch (e) {
    logger.error(e);
    timeout = setTimeout(main, 0);
  }
};

main();
