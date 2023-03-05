import { EmbassyRequester } from '../requester/EmbassyRequester';

export class EmbassyChecker {
  private _requester: EmbassyRequester;
  constructor(requester: EmbassyRequester) {
    this._requester = requester;
  }
  async isPossibleToRegister() {
    return await this._requester.checkDates();
  }
}
