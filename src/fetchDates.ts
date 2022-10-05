import { getStepThreeHeaders } from './headers/step_three';
import { getStepOneHeaders } from './headers/step_one';
import { getStepTwoHeaders } from './headers/step_two';
import { getDatesHeaders } from './headers/getDatesHeaders';
import { userData, service_ids } from './const';
import { scrapLog } from './loggers/logger';

export const fetchDates = async () => {
  const step1 = await fetch(
    'https://pieraksts.mfa.gov.lv/ru/uzbekistan/index',
    getStepOneHeaders()
  );

  scrapLog.info('requesting 1 step');
  const cookies = step1.headers.get('set-cookie');

  const cookie_match =
    /(mfaSchedulerSession=[^;]*;).*(_csrf-mfa-scheduler=[^;]*;)/.exec(
      cookies || ''
    ) || [];
  const sessionCookie = cookie_match[1];
  const schedulerCookie = cookie_match[2];

  const code1 =
    /"_csrf-mfa-scheduler"\s*value="([^"]*)">/.exec(await step1.text()) || [];
  const htmlCode1 = encodeURIComponent(code1[1]);

  scrapLog.info('requesting 2 step');
  const step2 = await fetch(
    'https://pieraksts.mfa.gov.lv/ru/uzbekistan/index',
    getStepTwoHeaders(schedulerCookie, sessionCookie, htmlCode1, userData)
  );

  const code2 =
    /"_csrf-mfa-scheduler"\s*value="([^"]*)">/.exec(await step2.text()) || [];
  const htmlCode2 = encodeURIComponent(code2[1]);

  scrapLog.info('requesting 3 step');
  const step3 = await fetch(
    'https://pieraksts.mfa.gov.lv/ru/uzbekistan/step2',
    getStepThreeHeaders(schedulerCookie, sessionCookie, htmlCode2, service_ids)
  );

  const nextYearDate = new Date().setFullYear(new Date().getFullYear() + 1);
  scrapLog.info('requesting dates');
  for (
    let i = new Date();
    i.getTime() < nextYearDate;
    i = new Date(i.setMonth(i.getMonth() + 1))
  ) {
    const year = i.getFullYear();
    const month = i.getMonth() + 1;

    const dates = await fetch(
      `https://pieraksts.mfa.gov.lv/ru/calendar/available-month-dates?year=${year}&month=${month}`,
      getDatesHeaders(schedulerCookie, sessionCookie)
    );
    const res = await dates.json();
    if (res != 'Šobrīd visi pieejamie laiki ir aizņemti') {
      scrapLog.info(`Found: ${res}`);
      return true;
    }
  }
  return false;
};
