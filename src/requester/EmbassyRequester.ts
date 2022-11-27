import { getStepThreeHeaders } from './headers/step_three';
import { getStepOneHeaders } from './headers/step_one';
import { getStepTwoHeaders } from './headers/step_two';
import { getDatesHeaders } from './headers/getDatesHeaders';
import { ParseHelper } from './ParseHelper';
import { CaptchaHelper } from './CaptchaHelper';
import {
  getStepFiveParamsShengen,
  getStepFiveParamsWorker,
  TypeGetStepFiveParams,
} from './headers/step_five';
import { getStepFourParams } from './headers/step_four';
import { getAvailableOptions } from './headers/available_time';
import { ResType } from '../embassy_worker/EmbassyWorker';
import { ProxyCreds } from '../db_controllers/ProxyController';
import { HttpsProxyAgent } from 'https-proxy-agent';
import fetch from 'node-fetch';
import winston from 'winston';
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
  addFieldOne: string;
  addFieldTwo: string;
  addFieldThree: string;
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
  private _agent?: HttpsProxyAgent;
  private _logger: winston.Logger;

  constructor(
    userData: UserData,
    proxy: ProxyCreds | null,
    logger: winston.Logger,
    captchaHelper?: CaptchaHelper
  ) {
    this._userData = userData;
    this._parseHelper = new ParseHelper();
    this._captchaHelper = captchaHelper || null;
    this._proxy = proxy;
    this._agent = this._proxy
      ? new HttpsProxyAgent(
          `http://${this._proxy.user}:${this._proxy.pass}@${this._proxy.host}:${this._proxy.port}`
        )
      : undefined;
    this._logger = logger.child({ service: 'EmbassyRequester' });
  }

  private async _step1() {
    this._stepNumber = RequesterStep.IDLE;
    const response = await fetch(
      'https://pieraksts.mfa.gov.lv/ru/uzbekistan/index',
      { ...getStepOneHeaders(), agent: this._agent }
    );

    this._logger.info('requesting 1 step');
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

    this._logger.info('requesting 2 step');
    const response = await fetch(
      'https://pieraksts.mfa.gov.lv/ru/uzbekistan/index',
      {
        ...getStepTwoHeaders(
          schedulerCookie,
          sessionCookie,
          step1Code,
          userData
        ),
        agent: this._agent,
      }
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

    this._logger.info('requesting 3 step');
    const step3 = await fetch(
      'https://pieraksts.mfa.gov.lv/ru/uzbekistan/step2',
      {
        ...getStepThreeHeaders(
          schedulerCookie,
          sessionCookie,
          step2Code,
          service_ids
        ),
        agent: this._agent,
      }
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
    const dates = await fetch(url, {
      ...getDatesHeaders(schedulerCookie, sessionCookie),
      agent: this._agent,
    }).catch((e) => {
      this._logger.error(e);
    });
    if (!dates) return null;
    const res = await dates.json();
    return res as string | string[];
  }
  private async _checkDatesByYearMonth(year: number, month: number) {
    const res = await this._availableMonthDatesRequest(year, month);
    if (res?.hasOwnProperty('length')) {
      if (res != 'Šobrīd visi pieejamie laiki ir aizņemti') {
        this._logger.info(
          `Found available-month-dates (year:${year}, month:${month}): ${JSON.stringify(
            res
          )}`
        );
        return true;
      } else {
        this._logger.info(
          `year:${year}, month:${month} - ${JSON.stringify(res)}`
        );
      }
    } else {
      this._logger.info(
        `Unrecognized response (year:${year}, month:${month}): ${JSON.stringify(
          res
        )}`
      );
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
    const res = await fetch(url, { ...options, agent: this._agent });
    const times_complex = (await res.json()) as {
      service_ids: { id: number; long_name: string }[];
      times: string[];
    }[];
    this._logger.info('_availableTimeRequest: ', JSON.stringify(times_complex));
    try {
      const time = times_complex?.pop()?.times;
      return time?.map((t) => ({ date, time: t }));
    } catch (e) {
      this._logger.error('catched :', e);
    }
    return [];
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
    const res = await fetch(url, { ...options, agent: this._agent });
    const text = await res.text();
    this._logger.info(`STEP FOUR TEXT: ${text}`);
    this._step4Code = this._parseHelper.parseStepCode(text) || '';
    this._stepNumber = RequesterStep.FOUR;
    return this;
  }

  private async _requestStepFive(
    getStepFiveParams: TypeGetStepFiveParams,
    signal: AbortSignal
  ) {
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
      this._logger.info('aborted');
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
      reCaptcha,
      schedulerCookie,
      sessionCookie,
      step4Code,
    });
    const res = await fetch(url, { ...options, agent: this._agent });

    const text = await res.text();

    this._logger.info('STEP FIVE TEXT: ', text);
    if (isAborted) return;
    const code = this._parseHelper.parseStepCode(text);
    if (code) {
      this._step4Code = code;
      this._captchaHelper.reportBad();
    } else {
      this._captchaHelper.reportGood();
      this._logger.info(text);

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
    this._logger.info('requesting dates');
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
    this._logger.info(date);
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
    this._logger.info(`getDateWithTimes: ${JSON.stringify(date_with_times)}`);
    return date_with_times.flat().filter((item) => !!item);
  }
  async requestUpToStepFour() {
    const times = await this.getDatesWithTimes();
    const selectedTime = times[Math.floor(Math.random() * times.length)];

    if (!selectedTime) throw Error('Not found Dates');

    this._date = selectedTime;
    this._logger.info(
      `requestUpToStepFour select random date: ${selectedTime.date}, ${selectedTime.time}`
    );
    return await this._requestStepFour(selectedTime.date, selectedTime.time);
  }
  async requestStepFive(signal: AbortSignal = new AbortController().signal) {
    if (this._userData.serviceIds[0] == ServiceIds.SHENGEN_SW_EST)
      return await this._requestStepFive(getStepFiveParamsShengen(), signal);
    if (this._userData.serviceIds[0] == ServiceIds.WORKER)
      return await this._requestStepFive(
        getStepFiveParamsWorker(this._userData),
        signal
      );
    this._logger.error(
      `ServiceId is not implemented: ${this._userData.serviceIds[0]}`
    );
    throw Error('ServiceId is not implemented');
  }
}
