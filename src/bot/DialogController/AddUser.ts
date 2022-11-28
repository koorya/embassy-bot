import { Markup } from 'telegraf';
import { ServiceIds, UserData } from '../../requester/EmbassyRequester';
import { BaseState, State, Idle, StateDeps } from './States';

export class AddUserBase extends BaseState {
  protected _userData: Partial<UserData>;
  constructor(deps: StateDeps, userData: Partial<UserData>) {
    super({ ...deps, logger: deps.logger.child({ bot_action: 'AddUser' }) });
    this._userData = userData;
  }
  get userData() {
    return this._userData;
  }
}
export class EnterServiceId extends AddUserBase implements State {
  ask() {
    this._deps.bot.telegram.sendMessage(
      this._deps.chatId,
      'Выберете вариант регистрации',
      Markup.inlineKeyboard(
        [
          Markup.button.callback(
            'SW/EST SHENGEN',
            `register-user-serviceid-${ServiceIds.SHENGEN_SW_EST}`
          ),
          // Markup.button.callback(
          //   'LV SHENGEN',
          //   `register-user-serviceid-${ServiceIds.SHENGEN_LV}`
          // ),
          // Markup.button.callback(
          //   'STUDENT',
          //   `register-user-serviceid-${ServiceIds.STUDENT}`
          // ),
          // Markup.button.callback(
          //   'CARRIER',
          //   `register-user-serviceid-${ServiceIds.CARRIER}`
          // ),
          Markup.button.callback(
            'WORKER',
            `register-user-serviceid-${ServiceIds.WORKER}`
          ),
        ],
        { columns: 3 }
      )
    );
  }

  hanlde(text: string): State {
    this._deps.logger.info(`EnterServiceId: ${text}`);
    if (text != 'text')
      return new EnterFirstName(this._deps, {
        serviceId: parseInt(text) as any as ServiceIds,
      });
    return this;
  }
}

export class EnterFirstName extends AddUserBase implements State {
  ask() {
    this._deps.bot.telegram.sendMessage(this._deps.chatId, 'Введите имя');
  }
  hanlde(text: string): State {
    if (text != 'text')
      return new EnterLastName(this._deps, {
        ...this.userData,
        firstName: text,
      });
    return this;
  }
}
export class EnterLastName extends AddUserBase implements State {
  ask() {
    this._deps.bot.telegram.sendMessage(this._deps.chatId, 'Введите Фамилию');
  }
  hanlde(text: string): State {
    if (text != 'text') {
      if (this._userData?.serviceId == ServiceIds.WORKER) {
        return new EnterInvitationNumber(this._deps, {
          ...this._userData,
          lastName: text,
        });
      } else if (this._userData?.serviceId == ServiceIds.SHENGEN_SW_EST) {
        return new EnterEmail(this._deps, {
          ...this._userData,
          lastName: text,
        });
      } else {
        return new EnterServiceId(this._deps, {});
      }
    }
    return this;
  }
}
export class EnterInvitationNumber extends AddUserBase implements State {
  ask() {
    this._deps.bot.telegram.sendMessage(
      this._deps.chatId,
      'Введите номер приглашения'
    );
  }
  hanlde(text: string): State {
    if (text != 'text')
      return new EnterOrgName(this._deps, {
        ...this._userData,
        serviceId: ServiceIds.WORKER,
        invitationNumber: text,
      });
    return this;
  }
}

export class EnterOrgName extends AddUserBase implements State {
  ask() {
    this._deps.bot.telegram.sendMessage(
      this._deps.chatId,
      'Введите название приглашающей компании'
    );
  }
  hanlde(text: string): State {
    if (text != 'text')
      return new EnterEmail(this._deps, {
        ...this._userData,

        serviceId: ServiceIds.WORKER,
        orgName: text,
      });
    return this;
  }
}

export class EnterEmail extends AddUserBase implements State {
  ask() {
    this._deps.bot.telegram.sendMessage(this._deps.chatId, 'Введите email');
  }
  hanlde(text: string): State {
    if (text != 'text')
      return new EnterPhone(this._deps, {
        ...this._userData,
        email: text as UserData['email'],
      });
    return this;
  }
}
export class EnterPhone extends AddUserBase implements State {
  ask() {
    this._deps.bot.telegram.sendMessage(this._deps.chatId, 'Введите телефон');
  }
  async hanlde(text: string) {
    if (text != 'text') {
      this._userData.phone = text as UserData['phone'];
      await this._deps.userController.addUser(this._userData as UserData);
      const { firstName, lastName, phone } = this.userData;
      this._deps.logger.info(
        `Add user with phone ${
          this._userData.phone
        } by ${this._deps.chatIdController.getChatUserById(
          this._deps.chatId
        )}:${this._deps.chatId}`
      );
      await this._deps.bot.telegram.sendMessage(
        this._deps.chatId,

        `Пользователь добавлен\n${firstName} ${lastName} ${phone}`
      );
      return new Idle(this._deps);
    }
    return this;
  }
}
