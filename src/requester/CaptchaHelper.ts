export class CaptchaHelper {
  private _api_key: string;
  private _id?: string;
  constructor(api_key: string) {
    this._api_key = api_key;
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
    console.log(this._id);

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
          console.log(text);
          timeout = setTimeout(getRes, 5000);
        } else {
          console.log(text);
          reject(text);
        }
        signal.removeEventListener('abort', onAbort);
      };
      let timeout = setTimeout(getRes, 5000);
    }).catch((r) => console.log(r));
    return reCaptcha || '';
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
        .then((r) => console.log(`good ${id}: ${r}`));
  }
  async reportBad() {
    const id = this._id;
    if (this._id)
      fetch(
        `http://2captcha.com/res.php?key=${this._api_key}&action=reportbad&id=${this._id}`
      )
        .then((r) => r.text())
        .then((r) => console.log(`bad ${id}: ${r}`));
  }
}
