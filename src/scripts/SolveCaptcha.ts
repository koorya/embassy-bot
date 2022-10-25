import { CaptchaHelper } from '../requester/CaptchaHelper';
(async () => {
  // const data = userData();
  // data.serviceIds = [ServiceIds.STUDENT];
  const captcha_helper = new CaptchaHelper(process.env.TWO_CAPTCHA_KEY || '');
  const captcha = await captcha_helper.getRecaptcha({
    action: 'formsubmit',
    googlekey: '6LcSzJwiAAAAAHEntI1QhUmBQ3lVO569yFRj8WHB',
    pageurl: 'https://skating.ga',
    score: '0.9',
  });
  console.log(captcha);
  const verif = await captcha_helper.verify({
    response: captcha || '',
    secret: '6LcSzJwiAAAAAKYQCFn26ZnoZ89g_9InLyWtLr9o',
  });
  console.log(verif);

  // const requester = new EmbassyRequester(data, captcha_helper);
  // console.log(await requester.getDatesWithTimes());
  // console.log(await requester.requestStepFive());
})();
