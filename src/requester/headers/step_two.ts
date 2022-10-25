export type UserParams = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
};

export const getStepTwoHeaders = (
  schedulerCookie: string,
  sessionCookie: string,
  htmlCode: string,
  user: UserParams
) => ({
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
    cookie: `${schedulerCookie} ${sessionCookie}`,
    Referer: 'https://pieraksts.mfa.gov.lv/ru/uzbekistan/index',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
  },
  body: `branch_office_id=40&_csrf-mfa-scheduler=${htmlCode}&Persons%5B0%5D%5Bfirst_name%5D=${
    user.firstName
  }&Persons%5B0%5D%5Blast_name%5D=${user.lastName}&e_mail=${encodeURIComponent(
    user.email
  )}&phone=${encodeURIComponent(user.phone)}`,
  method: 'POST',
});
