import { userData } from '../const';
import { CaptchaHelper } from '../requester/CaptchaHelper';
import { EmbassyRequester, ServiceIds } from '../requester/EmbassyRequester';
(async () => {
  const n = 20;
  const data = userData();
  data.serviceIds = [ServiceIds.STUDENT];
  const captchaKey = process.env.TWO_CAPTCHA_KEY || '';
  const ac = new AbortController();

  const register =
    (idx: number) => async (resolve: () => void, reject: () => void) => {
      const captcha_helper = new CaptchaHelper(captchaKey);
      const requester = new EmbassyRequester(data, captcha_helper);
      const step4 = await requester.requestUpToStepFour();
      while (!requester.isSuccessRegistration() && !ac.signal.aborted) {
        console.log(`${idx}: aborted: ${ac.signal.aborted}`);
        console.log(await step4.requestStepFive(ac.signal));
      }
      resolve();
    };
  const workers = Array.from(Array(n)).map(() => register);
  await Promise.race(workers.map((w, idx) => new Promise<void>(w(idx))));
  ac.abort();
  console.log(new Date());
})();
