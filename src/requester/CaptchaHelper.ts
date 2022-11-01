import { Logger } from 'winston';
import { scrapLog } from '../loggers/logger';

export class CaptchaHelper {
  private _api_key: string;
  private _id?: string;
  private _logger: Logger;
  constructor(api_key: string) {
    this._api_key = api_key;

    this._logger = scrapLog.child({ service: 'CaptchaHelper' });
  }
  async getRecaptcha(
    props: {
      googlekey: string;
      action: string;
      pageurl: string;
      score: string;
    },
    signal: AbortSignal = new AbortController().signal
  ) {
    const { googlekey, action, pageurl, score } = props;

    const api_key = this._api_key;
    const url = `https://2captcha.com/in.php?key=${api_key}&method=userrecaptcha&version=v3&min_score=${score}&action=${action}&googlekey=${googlekey}&pageurl=${pageurl}`;
    const res = await fetch(url);
    const id_match = /^OK\|(\d*)$/.exec(await res.text());
    if (!id_match) return;
    this._id = id_match[1];
    this._logger.info(this._id);
    try {
      const reCaptcha = await new Promise<string>(async (resolve, reject) => {
        const onAbort = () => {
          clearTimeout(timeout);
          reject('Aborted');
        };
        const getRes = async () => {
          signal.addEventListener('abort', onAbort, { once: true });
          if (signal.aborted) return '';
          const res = await fetch(
            `https://2captcha.com/res.php?key=${api_key}&action=get&id=${this._id}`,
            { signal }
          );
          const text = await res.text();

          const captcha_match = /^OK\|(.*)$/.exec(text);
          if (captcha_match) {
            resolve(captcha_match[1]);
          } else if (text === 'CAPCHA_NOT_READY') {
            this._logger.info(text);
            timeout = setTimeout(getRes, 5000);
          } else {
            this._logger.info(text);
            reject(text);
          }
          signal.removeEventListener('abort', onAbort);
        };
        let timeout = setTimeout(getRes, 5000);
      });
      return reCaptcha || '';
    } catch (r) {
      this._logger.error(r);
    }
    return '';
  }
  async verify(props: { response: string; secret: string }) {
    const { response, secret } = props;
    const req = await fetch(
      `https://www.google.com/recaptcha/api/siteverify?secret=${secret}&response=${response}`
    );
    const res = await req.json();
    return res;
  }
  async reportGood() {
    const id = this._id;
    if (this._id)
      fetch(
        `http://2captcha.com/res.php?key=${this._api_key}&action=reportgood&id=${this._id}`
      )
        .then((r) => r.text())
        .then((r) => this._logger.info(`good ${id}: ${r}`));
  }
  async reportBad() {
    const id = this._id;
    if (this._id)
      fetch(
        `http://2captcha.com/res.php?key=${this._api_key}&action=reportbad&id=${this._id}`
      )
        .then((r) => r.text())
        .then((r) => this._logger.info(`bad ${id}: ${r}`));
  }
}
