import { userData } from '../const';
import { CaptchaHelper } from '../requester/CaptchaHelper';
import {
  EmbassyRequester,
  ServiceIds,
  UserData,
} from '../requester/EmbassyRequester';

export type ResType = {
  userData: UserData;
  date: {
    date: string;
    time: string;
  };
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
  constructor(userData: UserData, parallel_factor: number) {
    this._parallel_factor = parallel_factor;
    this._userData = userData;
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
    const register =
      (idx: number) =>
      async (resolve: (res: ResType) => void, reject: () => void) => {
        const captcha_helper = new CaptchaHelper(captchaKey);
        const requester = new EmbassyRequester(this._userData, captcha_helper);
        const step4 = await requester.requestUpToStepFour();
        while (!requester.isSuccessRegistration() && !ac.signal.aborted) {
          console.log(await step4.requestStepFive(ac.signal));
        }
        const result = requester.isSuccessRegistration();
        if (result.success) resolve(result.info);
        reject();
      };
    const workers = Array.from(Array(n)).map(() => register);
    const result = await Promise.race(
      workers.map((w, idx) => new Promise<ResType>(w(idx)))
    ).catch((r) => {});
    ac.abort();
    console.log(new Date());

    signal.removeEventListener('abort', onAbort);
    return result;
  }
  async registerUserFake(signal: AbortSignal) {
    return {
      date: { date: '20.04.2022', time: '21:43' },
      userData: this._userData,
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
  createEmbassyRegister(userData: UserData) {
    return new EmbassyRegister(userData, this._parallel_factor);
  }
  createEmbassyMonitor() {
    const requester = new EmbassyRequester({
      email: process.env.DEFAULT_EMAIL,
      firstName: process.env.DEFAULT_FIRSTNAME,
      lastName: process.env.DEFAULT_LASTNAME,
      notes: process.env.DEFAULT_NOTES,
      phone: process.env.DEFAULT_PHONE,
      serviceIds: [ServiceIds.SHENGEN_LV],
    } as UserData);
    return new EmbassyChecker(requester);
  }
}
