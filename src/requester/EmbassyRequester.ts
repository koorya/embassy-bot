import { getStepThreeHeaders } from './headers/step_three';
import { getStepOneHeaders } from './headers/step_one';
import { getStepTwoHeaders } from './headers/step_two';
import { getDatesHeaders } from './headers/getDatesHeaders';
import { scrapLog } from '../loggers/logger';
import { ParseHelper } from './ParseHelper';
type Cookies = {
  sessionCookie: string;
  schedulerCookie: string;
};

export enum ServiceIds {
  SHENGEN_SW_EST = 598, // Шенгенская виза в Швейцарию и Эстонию
  SHENGEN_LV = 588, // Шенгенская виза в Латвию для граждан Узбекистана и Таджикистана
  STUDENT = 220, // Студенческая виза для граждан Республики Узбекистан
  CARRIER = 440, // Виза для грузоперевозчиков
  WORKER = 227, // Оформление латвийской рабочей визы для граждан Узбекистана
}

export type UserData = {
  phone: `+998${number}`; // +998 + 9 digits
  firstName: string;
  lastName: string;
  email: `${string}@${string}`;
  serviceIds: ServiceIds[];
};

enum RequesterStep {
  IDLE,
  ONE,
  TWO,
  THREE,
  FOUR,
}

export class EmbassyRequester {
  private _cookies?: Cookies;
  private _step1Code?: string;
  private _step2Code?: string;
  private _stepNumber: RequesterStep = RequesterStep.IDLE;
  private _userData: UserData;
  private _parseHelper: ParseHelper;

  constructor(userData: UserData) {
    this._userData = userData;
    this._parseHelper = new ParseHelper();
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

    const code = this._parseHelper.parseStepCode(await response.text());
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
    const code = this._parseHelper.parseStepCode(await response.text());
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
}
