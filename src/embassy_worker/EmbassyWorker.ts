import winston, { createLogger, format, transports } from 'winston';
import { ProxyCreds } from '../db_controllers/ProxyController';
import { ScrapeLogger } from '../loggers/logger';
import { CaptchaHelper } from '../requester/CaptchaHelper';
import {
  EmbassyRequester,
  ServiceIds,
  UserData,
  UserDataBase,
} from '../requester/EmbassyRequester';

export type ResType = {
  userData: UserData;
  date: {
    date: string;
    time: string;
  };
  proxy?: string;
};
export class EmbassyChecker {
  private _requester: EmbassyRequester;
  constructor(requester: EmbassyRequester) {
    this._requester = requester;
  }
  async isPossibleToRegister() {
    return await this._requester.checkDates();
  }
}

export class EmbassyRegister {
  private _parallel_factor: number;
  private _userData: UserData;
  private _proxy: ProxyCreds;
  constructor(userData: UserData, proxy: ProxyCreds, parallel_factor: number) {
    this._parallel_factor = parallel_factor;
    this._userData = userData;
    this._proxy = proxy;
  }

  async registerUser(signal: AbortSignal) {
    const n = this._parallel_factor;
    // this._userData.serviceIds = [ServiceIds.STUDENT];
    const captchaKey = process.env.TWO_CAPTCHA_KEY || '';
    const ac = new AbortController();
    const onAbort = () => {
      ac.abort();
    };
    signal.addEventListener('abort', onAbort, { once: true });
    const timestamp = Date.now();
    const register =
      (idx: number, logger: winston.Logger) =>
      async (resolve: (res: ResType) => void, reject: () => void) => {
        const captcha_helper = new CaptchaHelper(captchaKey);
        const requester = new EmbassyRequester(
          this._userData,
          this._proxy,
          logger,
          captcha_helper
        );
        const step4 = await requester.requestUpToStepFour();
        while (!requester.isSuccessRegistration() && !ac.signal.aborted) {
          const res = await step4.requestStepFive(ac.signal);
          logger.info(`registerUser.register.requestStepFive: ${res}`);
        }
        const result = requester.isSuccessRegistration();
        if (result.success) resolve(result.info);
        reject();
      };
    const workers = Array.from(Array(n)).map(() => register);
    const result = await Promise.race(
      workers.map(
        (w, idx) =>
          new Promise<ResType>(
            w(
              idx,
              ScrapeLogger.getInstance().child({
                variant: `regworker_${timestamp}_${idx + 1}_of_${n}`,
              })
            )
          )
      )
    ).catch((r) => {});
    ac.abort();

    signal.removeEventListener('abort', onAbort);
    return result;
  }
  async registerUserFake(signal: AbortSignal) {
    return {
      date: { date: '20.04.2022', time: '21:43' },
      userData: this._userData,
      proxy: this._proxy.host,
    } as ResType;
  }
}

export class EmbassyWorkerCreator {
  private _parallel_factor: number;
  constructor(parallel_factor?: number) {
    if (!parallel_factor)
      this._parallel_factor = parseInt(process.env.PARALLEL_FACTOR || '20');
    else this._parallel_factor = parallel_factor;
  }
  createEmbassyRegister(userData: UserData, proxy: ProxyCreds) {
    return new EmbassyRegister(userData, proxy, this._parallel_factor);
  }
  createEmbassyMonitor() {
    const requester = new EmbassyRequester(
      {
        email: process.env.DEFAULT_EMAIL,
        firstName: process.env.DEFAULT_FIRSTNAME,
        lastName: process.env.DEFAULT_LASTNAME,
        phone: process.env.DEFAULT_PHONE,
        serviceId: ServiceIds.WORKER,
      } as UserData,
      null,
      ScrapeLogger.getInstance().child({ variant: 'monitor' })
    );
    return new EmbassyChecker(requester);
  }
}
