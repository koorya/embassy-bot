import winston from 'winston';
import { ProxyCreds } from '../db_controllers/ProxyController';
import { ScrapeLogger } from '../loggers/logger';
import { CaptchaHelper } from '../requester/CaptchaHelper';
import { EmbassyRequester, UserData } from '../requester/EmbassyRequester';
import { ResType } from './ResType';

export abstract class EmbassyRegister {
  protected _parallel_factor: number;
  protected _userData: UserData;
  protected _proxy: ProxyCreds;
  constructor(userData: UserData, proxy: ProxyCreds, parallel_factor: number) {
    this._parallel_factor = parallel_factor;
    this._userData = userData;
    this._proxy = proxy;
  }
  abstract registerUser(signal: AbortSignal): Promise<ResType>;
}
export class EmbassyRegisterProd extends EmbassyRegister {
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

    const resultTyped: ResType = result
      ? { ...result }
      : { isRegistered: false, userData: this._userData };

    return resultTyped;
  }
}

export class EmbassyRegisterDev extends EmbassyRegister {
  async registerUser(signal: AbortSignal) {
    return {
      date: { date: '20.04.2022', time: '21:43' },
      userData: this._userData,
      proxy: this._proxy.host,
      isRegistered: true,
    } as ResType;
  }
}
