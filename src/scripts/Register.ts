import { createLogger, transports } from 'winston';
import { userData } from '../const';
import { CaptchaHelper } from '../requester/CaptchaHelper';
import { EmbassyRequester, ServiceIds } from '../requester/EmbassyRequester';
(async () => {
  const data = userData();
  data.serviceIds = [ServiceIds.STUDENT];
  const captcha_helper = new CaptchaHelper(process.env.TWO_CAPTCHA_KEY || '');
  const requester = new EmbassyRequester(
    data,
    null,
    createLogger({ transports: [transports.Console] }),
    captcha_helper
  );
  // console.log(await requester.getDatesWithTimes());
  const step4 = await requester.requestUpToStepFour();
  while (!requester.isSuccessRegistration()) {
    console.log(await step4.requestStepFive());
  }
  console.log(new Date());
})();
