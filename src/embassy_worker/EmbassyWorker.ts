import { ProxyCreds } from '../db_controllers/ProxyController';
import { ScrapeLogger } from '../loggers/logger';
import { EmbassyMonitorCreator } from '../monitor_logic/MonitorLogic';
import { EmbassyRegisterCreator } from '../monitor_logic/Registrator';
import {
  EmbassyRequester,
  ServiceIds,
  UserData,
} from '../requester/EmbassyRequester';
import { EmbassyChecker } from './EmbassyChecker';
import {
  EmbassyRegister,
  EmbassyRegisterDev,
  EmbassyRegisterProd,
} from './EmbassyRegister';

export class EmbassyWorkerCreator
  implements EmbassyRegisterCreator, EmbassyMonitorCreator
{
  private _parallel_factor: number;
  private _is_dev: boolean;
  constructor(dev_mode: boolean, parallel_factor?: number) {
    this._is_dev = dev_mode;
    if (!parallel_factor)
      this._parallel_factor = parseInt(process.env.PARALLEL_FACTOR || '20');
    else this._parallel_factor = parallel_factor;
  }
  createEmbassyRegister(userData: UserData, proxy: ProxyCreds) {
    if (this._is_dev)
      return new EmbassyRegisterDev(
        userData,
        proxy,
        this._parallel_factor
      ) as EmbassyRegister;
    else
      return new EmbassyRegisterProd(
        userData,
        proxy,
        this._parallel_factor
      ) as EmbassyRegister;
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
