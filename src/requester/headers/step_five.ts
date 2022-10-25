export const getStepFiveParams = (props: {
  schedulerCookie: string;
  sessionCookie: string;
  step4Code: string;
  notes_public: string;
  reCaptcha: string;
}) => ({
  url: 'https://pieraksts.mfa.gov.lv/ru/uzbekistan/step4',
  options: {
    headers: {
      accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
      'accept-language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
      'cache-control': 'no-cache',
      'content-type': 'application/x-www-form-urlencoded',
      pragma: 'no-cache',
      'sec-ch-ua':
        '"Chromium";v="106", "Google Chrome";v="106", "Not;A=Brand";v="99"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Linux"',
      'sec-fetch-dest': 'document',
      'sec-fetch-mode': 'navigate',
      'sec-fetch-site': 'same-origin',
      'sec-fetch-user': '?1',
      'upgrade-insecure-requests': '1',
      cookie: `${props.schedulerCookie} ${props.sessionCookie}`,
      Referer: 'https://pieraksts.mfa.gov.lv/ru/uzbekistan/step4',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    },
    body: `_csrf-mfa-scheduler=${props.step4Code}&notes_public=${props.notes_public}&reCaptcha=${props.reCaptcha}&personal-data=`,
    method: 'POST',
  },
});
