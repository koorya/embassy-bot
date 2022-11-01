import { Collection, Db, ObjectId } from 'mongodb';
import winston from 'winston';
import { scrapLog } from '../loggers/logger';
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
  private _logger: winston.Logger;

  constructor(db: Db) {
    this._proxyCollection = db.collection<ProxyWithHistory>('proxies');

    this._logger = scrapLog.child({ service: 'ProxyController' });
  }
  async getProxies() {
    this._logger.info('Proxy requested');
    const proxies = await this._proxyCollection.find().toArray();
    this._logger.info(`proxy count: ${proxies.length}`);

    return proxies.sort((a, b) => {
      if (!a.history.length) return -1;
      if (!b.history.length) return 1;

      return (
        Math.max(...a.history.map((h) => h.date.getTime())) -
        Math.max(...b.history.map((h) => h.date.getTime()))
      );
    });
  }
  async addProxy(creds: ProxyCreds) {
    this._logger.info(`Proxy will created: ${creds.host}`);
    await this._proxyCollection.insertOne({
      ...creds,
      history: [],
    });
  }
  async removeProxyByHost(host: ProxyCreds['host']) {
    this._logger.info(`Proxy will removed by host: ${host}`);
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
