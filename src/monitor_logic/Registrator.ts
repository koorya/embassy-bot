import winston from 'winston';
import { MessageController } from '../db_controllers/MessageController';
import { ProxyController, ProxyCreds } from '../db_controllers/ProxyController';
import { UserController } from '../db_controllers/UserController';
import { EmbassyRegister } from '../embassy_worker/EmbassyRegister';
import { ScrapeLogger } from '../loggers/logger';
import { UserData } from '../requester/EmbassyRequester';
import { RegistratorAll } from './MonitorLogicBase';

export interface EmbassyRegisterCreator {
  createEmbassyRegister(userData: UserData, proxy: ProxyCreds): EmbassyRegister;
}

export class Registrator implements RegistratorAll {
  private _userController: UserController;
  private _embassyRegisterCreator: EmbassyRegisterCreator;
  private _messageController: MessageController;
  private _proxyController: ProxyController;
  private _logger: winston.Logger;
  constructor(
    userController: UserController,
    messageController: MessageController,
    proxyController: ProxyController,
    embassyRegisterCreator: EmbassyRegisterCreator
  ) {
    this._userController = userController;
    this._embassyRegisterCreator = embassyRegisterCreator;
    this._messageController = messageController;
    this._proxyController = proxyController;

    this._logger = ScrapeLogger.getInstance().child({ service: 'Registrator' });
  }

  async registerAll(signal: AbortSignal) {
    this._logger.info('Run registration');
    const proxyList = await this._proxyController.getProxies();

    const not_registered = await this._userController.listNotRegistered();
    const users_to_register = not_registered.slice(0, proxyList.length);
    this._logger.info(`users not registered: ${not_registered.length}`);
    this._logger.info(`Proxies to register: ${proxyList.length}`);
    this._logger.info(`Users to register: ${users_to_register.length}`);
    const registrators = users_to_register.map((ud, idx) =>
      this._embassyRegisterCreator.createEmbassyRegister(ud, proxyList[idx])
    );
    Promise.allSettled(registrators.map((r) => r.registerUser(signal)))
      .then((r) => {
        r?.map(async (r) => {
          if (r.status == 'fulfilled' && !!r.value && r.value.isRegistered) {
            const {
              userData: { firstName, email, lastName, phone },
              date: { date, time },
              proxy,
            } = r.value;
            await this._userController.setRegisteredByPhone(
              phone,
              `${date} в ${time}`,
              proxy
            );

            this._proxyController.markUsedByHost(proxy || '', phone);
            this._logger.info(
              `Registered with phone ${phone} by proxy ${proxy}`
            );
            const message = `Зарегистрирован ${firstName} ${lastName} на ${date} в ${time}. ${email}\n через ${proxy}`;

            this._messageController.addMessage(message);
          }
        });
      })
      .catch((e) => this._logger.error(JSON.stringify(e)));
  }
}
