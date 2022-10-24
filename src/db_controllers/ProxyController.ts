import { Collection, Db, ObjectId } from 'mongodb';
import { UserData } from '../requester/EmbassyRequester';

export type ProxyCreds = {
  host: string;
  port: string;
  user: string;
  pass: string;
};
export type ProxyWithHistory = ProxyCreds & {
  history: { date: Date; phone: UserData['phone'] }[];
};

export class ProxyController {
  private _proxyCollection: Collection<ProxyWithHistory>;

  constructor(db: Db) {
    this._proxyCollection = db.collection<ProxyWithHistory>('proxies');
  }
  async getProxies() {
    return (await this._proxyCollection.find().toArray()).sort((a, b) => {
      if (!a.history.length) return -1;
      if (!b.history.length) return 1;

      return (
        Math.max(...a.history.map((h) => h.date.getTime())) -
        Math.max(...b.history.map((h) => h.date.getTime()))
      );
    });
  }
  async addProxy(creds: ProxyCreds) {
    await this._proxyCollection.insertOne({
      ...creds,
      history: [],
    });
  }
  async removeProxyByHost(host: ProxyCreds['host']) {
    await this._proxyCollection.deleteOne({ host });
  }

  async markUsedByHost(host: string, phone: UserData['phone']) {
    await this._proxyCollection.updateOne(
      { host },
      {
        $push: { history: { date: new Date(), phone } },
      }
    );
  }
}
