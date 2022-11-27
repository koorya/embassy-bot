import fs from 'fs';

export class HarAdapter {
  private _har: any;
  async readFile() {
    const buffer = await new Promise<Buffer>((resolve, reject) =>
      fs.readFile(
        'har/ff_pieraksts.mfa.gov.lv_Archive [22-11-03 06-09-02].har',
        (err, data) => resolve(data)
      )
    );
    const har = JSON.parse(buffer.toString());
    this._har = har;
  }
  getHar() {
    return this._har;
  }
  getEntity() {
    const entries: {
      request: {
        method: 'GET' | 'POST';
        url: string;
      };
      response: { status: number };
    }[] = this._har['log']['entries'];
    return entries.find(
      ({ request: { method, url }, response: { status } }) => {
        if (method === 'GET' && url.match(/.*index$/) && status === 200)
          return true;
      }
    );
  }
  getResponseText(response: any): string {
    return response['response']['content']['text'];
  }
  getResponseCookie(response: any): string {
    return response['response']['headers'].find(
      ({ name }: { name: string }) => name == 'Set-Cookie'
    )['value'];
  }
}
