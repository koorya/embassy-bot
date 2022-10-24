import { getStepThreeHeaders } from './headers/step_three';
import { getStepOneHeaders } from './headers/step_one';
import { getStepTwoHeaders } from './headers/step_two';
import { getDatesHeaders } from './headers/getDatesHeaders';
import { scrapLog } from '../loggers/logger';
import { ParseHelper } from './ParseHelper';
import { CaptchaHelper } from './CaptchaHelper';
import { getStepFiveParams } from './headers/step_five';
import { getStepFourParams } from './headers/step_four';
import { getAvailableOptions } from './headers/available_time';
import { ResType } from '../embassy_worker/EmbassyWorker';
import { ProxyCreds } from '../db_controllers/ProxyController';
type Cookies = {
  sessionCookie: string;
  schedulerCookie: string;
};

export enum ServiceIds {
  SHENGEN_SW_EST = '598', // Шенгенская виза в Швейцарию и Эстонию
  SHENGEN_LV = '588', // Шенгенская виза в Латвию для граждан Узбекистана и Таджикистана
  STUDENT = '220', // Студенческая виза для граждан Республики Узбекистан
  CARRIER = '440', // Виза для грузоперевозчиков
  WORKER = '227', // Оформление латвийской рабочей визы для граждан Узбекистана
}

export type UserData = {
  phone: `+998${number}`; // +998 + 9 digits
  firstName: string;
  lastName: string;
  email: `${string}@${string}`;
  serviceIds: ServiceIds[];
  notes: string;
};

enum RequesterStep {
  IDLE,
  ONE,
  TWO,
  THREE,
  FOUR,
  FIVE,
}

export class EmbassyRequester {
  private _cookies?: Cookies;
  private _step1Code?: string;
  private _step2Code?: string;
  private _step3Code?: string;
  private _step4Code?: string;
  private _stepNumber: RequesterStep = RequesterStep.IDLE;
  private _userData: UserData;
  private _parseHelper: ParseHelper;
  private _captchaHelper: CaptchaHelper | null;
  private _date?: { date: string; time: string };
  private _proxy: ProxyCreds | null;

  constructor(
    userData: UserData,
    proxy: ProxyCreds | null,
    captchaHelper?: CaptchaHelper
  ) {
    this._userData = userData;
    this._parseHelper = new ParseHelper();
    this._captchaHelper = captchaHelper || null;
    this._proxy = proxy;
  }

  private async _step1() {
    this._stepNumber = RequesterStep.IDLE;

    const response = await fetch(
      'https://pieraksts.mfa.gov.lv/ru/uzbekistan/index',
      getStepOneHeaders()
    );

    scrapLog.info('requesting 1 step');
    const cookies = this._parseHelper.parseCookie(
      response.headers.get('set-cookie') || ''
    );

    const code = this._parseHelper.parseStepCode(await response.text()) || '';
    this._cookies = cookies;
    this._step1Code = code;
    this._stepNumber = RequesterStep.ONE;
    return this;
  }
  private async _step2(userData: UserData) {
    if (
      this._stepNumber != RequesterStep.ONE ||
      !this._cookies ||
      !this._step1Code
    )
      throw Error('Invalid state');

    const {
      _cookies: { schedulerCookie, sessionCookie },
      _step1Code: step1Code,
    } = this;

    scrapLog.info('requesting 2 step');
    const response = await fetch(
      'https://pieraksts.mfa.gov.lv/ru/uzbekistan/index',
      getStepTwoHeaders(schedulerCookie, sessionCookie, step1Code, userData)
    );
    const code = this._parseHelper.parseStepCode(await response.text()) || '';
    this._step2Code = code;
    this._stepNumber = RequesterStep.TWO;
    return this;
  }
  private async _step3(service_ids: ServiceIds[]) {
    if (
      this._stepNumber != RequesterStep.TWO ||
      !this._cookies ||
      !this._step2Code
    )
      throw Error('Invalid state');

    const {
      _cookies: { schedulerCookie, sessionCookie },
      _step2Code: step2Code,
    } = this;

    scrapLog.info('requesting 3 step');
    const step3 = await fetch(
      'https://pieraksts.mfa.gov.lv/ru/uzbekistan/step2',
      getStepThreeHeaders(
        schedulerCookie,
        sessionCookie,
        step2Code,
        service_ids
      )
    );
    this._step3Code = this._parseHelper.parseStepCode(await step3.text()) || '';
    this._stepNumber = RequesterStep.THREE;
    return this;
  }

  private async _availableMonthDatesRequest(year: number, month: number) {
    if (this._stepNumber != RequesterStep.THREE || !this._cookies)
      throw Error('Invalid state');
    const {
      _cookies: { schedulerCookie, sessionCookie },
    } = this;
    const url = `https://pieraksts.mfa.gov.lv/ru/calendar/available-month-dates?year=${year}&month=${month}`;
    const dates = await fetch(
      url,
      getDatesHeaders(schedulerCookie, sessionCookie)
    );
    const res = await dates.json();
    return res as string | string[];
  }
  private async _checkDatesByYearMonth(year: number, month: number) {
    const res = await this._availableMonthDatesRequest(year, month);
    if (res != 'Šobrīd visi pieejamie laiki ir aizņemti') {
      scrapLog.info(`Found available-month-dates`);
      return true;
    }
    return false;
  }
  private async _getDatesByYearMonth(year: number, month: number) {
    const res = await this._availableMonthDatesRequest(year, month);
    if (res?.length) {
      return res as string[];
    }
    return [];
  }

  private async _availableTimeRequest(date: string) {
    if (this._stepNumber != RequesterStep.THREE || !this._cookies)
      throw Error('Invalid state');
    const {
      _cookies: { schedulerCookie, sessionCookie },
    } = this;
    const { url, options } = getAvailableOptions({
      date,
      schedulerCookie,
      sessionCookie,
    });
    const res = await fetch(url, options);
    const times_complex = (await res.json()) as {
      service_ids: { id: number; long_name: string }[];
      times: string[];
    }[];
    const time = times_complex.pop()?.times;
    return time?.map((t) => ({ date, time: t }));
  }

  private async _requestStepFour(visit_date: string, visit_time: string) {
    if (
      this._stepNumber != RequesterStep.THREE ||
      !this._step3Code ||
      !this._cookies
    )
      throw Error('Invalid step');
    const {
      _userData: { serviceIds },
      _step3Code: step3Code,

      _cookies: { schedulerCookie, sessionCookie },
    } = this;

    const { url, options } = getStepFourParams({
      schedulerCookie,
      serviceIds,
      sessionCookie,
      step3Code,
      visit_date,
      visit_time,
    });
    const res = await fetch(url, options);
    const text = await res.text();
    this._step4Code = this._parseHelper.parseStepCode(text) || '';
    this._stepNumber = RequesterStep.FOUR;
    return this;
  }

  private async _requestStepFive(notes_public: string, signal: AbortSignal) {
    if (!this._captchaHelper) {
      throw Error('Invalid captcha helper');
    }
    if (
      this._stepNumber != RequesterStep.FOUR ||
      !this._step4Code ||
      !this._cookies
    )
      throw Error('Invalid step');
    const {
      _userData: { serviceIds },
      _step4Code: step4Code,

      _cookies: { schedulerCookie, sessionCookie },
    } = this;
    // return ';';
    let isAborted = false;
    const onAbort = () => {
      isAborted = true;
    };
    signal.addEventListener('abort', onAbort, { once: true });
    const reCaptcha =
      (await this._captchaHelper.getRecaptcha(
        {
          googlekey: '6LcNh8QUAAAAABr3tVBk1tkgg8xlr1DDmmYtGwCA',
          pageurl: 'https://pieraksts.mfa.gov.lv/ru/uzbekistan/step4',
          score: '0.9',
          action: 'formsubmit',
        },
        signal
      )) || '';

    if (isAborted) return;
    const { url, options } = getStepFiveParams({
      notes_public,
      reCaptcha,
      schedulerCookie,
      sessionCookie,
      step4Code,
    });
    const res = await fetch(url, { ...options, signal });

    const text = await res.text();

    if (isAborted) return;
    const code = this._parseHelper.parseStepCode(text);
    if (code) {
      this._step4Code = code;
      this._captchaHelper.reportBad();
    } else {
      this._captchaHelper.reportGood();
      console.log(text);

      this._stepNumber = RequesterStep.FIVE;
    }

    signal.removeEventListener('abort', onAbort);
    return { success: !code };
  }

  isSuccessRegistration():
    | { success: true; info: ResType }
    | { success: false; info: undefined } {
    if (this._stepNumber == RequesterStep.FIVE && this._date)
      return {
        success: true,
        info: {
          userData: this._userData,
          date: this._date,
          proxy: this._proxy?.host,
        },
      };
    else return { success: false, info: undefined };
  }
  async toStep3() {
    const userData = this._userData;
    const { serviceIds } = userData;

    const step3 = await this._step1()
      .then((r) => r._step2(userData))
      .then((r) => r._step3(serviceIds));
    return step3;
  }

  private async _getDates() {
    scrapLog.info('requesting dates');
    const nextYearDate = new Date().setFullYear(new Date().getFullYear() + 1);
    const availableDates: string[] = [];
    for (
      let i = new Date();
      i.getTime() < nextYearDate;
      i = new Date(i.setMonth(i.getMonth() + 1))
    ) {
      const year = i.getFullYear();
      const month = i.getMonth() + 1;
      const currentDates = await this._getDatesByYearMonth(year, month);
      availableDates.push(...currentDates);
    }
    return availableDates;
  }
  private async _checkDates() {
    const date = new Date();
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    return await this._checkDatesByYearMonth(year, month);
  }

  async checkDates() {
    const isDateAvailable = await this.toStep3().then((r) => r._checkDates());
    return isDateAvailable;
  }
  async getDates() {
    return await this.toStep3().then((r) => r._getDates());
  }
  async getDatesWithTimes() {
    const step3 = await this.toStep3();
    const dates = await step3._getDates();
    const date_with_times = await Promise.all(
      dates.map((date) => step3._availableTimeRequest(date))
    );
    console.log(date_with_times);
    return date_with_times.flat().filter((item) => !!item);
  }
  async requestUpToStepFour() {
    const times = await this.getDatesWithTimes();
    const selectedTime = times[Math.floor(Math.random() * times.length)];

    if (!selectedTime) throw Error('Not found Dates');

    this._date = selectedTime;
    console.log(selectedTime.date, selectedTime.time);
    return await this._requestStepFour(selectedTime.date, selectedTime.time);
  }
  async requestStepFive(signal: AbortSignal = new AbortController().signal) {
    return await this._requestStepFive(this._userData.notes, signal);
  }
}
