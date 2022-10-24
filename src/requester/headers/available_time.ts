export const getAvailableOptions = (props: {
  date: string;
  schedulerCookie: string;
  sessionCookie: string;
}) => ({
  url: `https://pieraksts.mfa.gov.lv/ru/calendar/available-time-slots?date=${props.date}`,
  options: {
    headers: {
      accept: '*/*',
      'accept-language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
      'cache-control': 'no-cache',
      pragma: 'no-cache',
      'sec-ch-ua':
        '"Chromium";v="106", "Google Chrome";v="106", "Not;A=Brand";v="99"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Linux"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-origin',
      'x-requested-with': 'XMLHttpRequest',
      cookie: `${props.schedulerCookie} ${props.sessionCookie}`,
      Referer: 'https://pieraksts.mfa.gov.lv/ru/uzbekistan/step3',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    },
    body: null,
    method: 'GET',
  },
});
