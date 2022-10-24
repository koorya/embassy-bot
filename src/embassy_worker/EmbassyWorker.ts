import { userData } from '../const';
import { CaptchaHelper } from '../requester/CaptchaHelper';
import {
  EmbassyRequester,
  ServiceIds,
  UserData,
} from '../requester/EmbassyRequester';

type ResType = {
  userData: UserData;
  date: {
    date: string;
    time: string;
  } | null;
};

export class EmbassyWorker {
  private _requester: EmbassyRequester;
  private _parallel_factor: number;
  constructor(requester: EmbassyRequester, parallel_factor: number) {
    this._requester = requester;
    this._parallel_factor = parallel_factor;
  }
  async isPossibleToRegister() {
    return await this._requester.checkDates();
  }

  async registerUser(userData: UserData) {
    const n = this._parallel_factor;
    userData.serviceIds = [ServiceIds.STUDENT];
    const captchaKey = process.env.TWO_CAPTCHA_KEY || '';
    const ac = new AbortController();

    const register =
      (idx: number) =>
      async (resolve: (res: ResType) => void, reject: () => void) => {
        const captcha_helper = new CaptchaHelper(captchaKey);
        const requester = new EmbassyRequester(userData, captcha_helper);
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
    return result;
  }
}

export class EmbassyWorkerCreator {
  private _parallel_factor: number;
  constructor(parallel_factor: number) {
    this._parallel_factor = parallel_factor;
  }
  createEmbassyWorker(userData: UserData) {
    const requester = new EmbassyRequester(userData);
    return new EmbassyWorker(requester, this._parallel_factor);
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
    return new EmbassyWorker(requester, 0);
  }
}
