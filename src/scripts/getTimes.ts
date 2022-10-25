import { userData } from '../const';
import { CaptchaHelper } from '../requester/CaptchaHelper';
import { EmbassyRequester, ServiceIds } from '../requester/EmbassyRequester';
(async () => {
  const data = userData();
  data.serviceIds = [ServiceIds.STUDENT];
  const captcha_helper = new CaptchaHelper(process.env.TWO_CAPTCHA_KEY || '');
  const requester = new EmbassyRequester(data, null,  captcha_helper);
  // console.log(await requester.getDatesWithTimes());
  console.log(await requester.requestStepFive());
})();
