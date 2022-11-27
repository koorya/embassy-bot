import { createLogger, transports } from 'winston';
import { userData } from '../const';
import { CaptchaHelper } from '../requester/CaptchaHelper';
import { EmbassyRequester, ServiceIds } from '../requester/EmbassyRequester';
(async () => {
  const data = userData();
  const captcha_helper = new CaptchaHelper(process.env.TWO_CAPTCHA_KEY || '');
  const requester = new EmbassyRequester(
    { ...data, serviceId: ServiceIds.SHENGEN_SW_EST },
    null,
    createLogger({ transports: [transports.Console] }),
    captcha_helper
  );
  // console.log(await requester.getDatesWithTimes());
  console.log(await requester.requestStepFive());
})();
