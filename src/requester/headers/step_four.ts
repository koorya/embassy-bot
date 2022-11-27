import { ServiceIds } from '../EmbassyRequester';

export const getStepFourParams = (props: {
  schedulerCookie: string;
  sessionCookie: string;
  step3Code: string;
  visit_date: string;
  serviceId: ServiceIds;
  visit_time: string;
}) => ({
  url: 'https://pieraksts.mfa.gov.lv/ru/uzbekistan/step3',
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
      Referer: 'https://pieraksts.mfa.gov.lv/ru/uzbekistan/step3',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    },
    body: `_csrf-mfa-scheduler=${
      props.step3Code
    }&ServiceGroups%5B0%5D%5Bvisit_date%5D=${
      props.visit_date
    }&ServiceGroups%5B0%5D%5Bservice_ids%5D%5B0%5D=${
      props.serviceId
    }&ServiceGroups%5B0%5D%5Bvisit_time%5D=${encodeURIComponent(
      props.visit_time
    )}`,
    // body: formData,
    method: 'POST',
  },
});
