import { Telegraf } from 'telegraf';
import winston from 'winston';
import { ChatIdController } from '../../db_controllers/ChatIdsController';
import { UserController } from '../../db_controllers/UserController';

export interface State {
  ask(): void;
  hanlde(text: string): State | Promise<State>;
}
export type StateDeps = {
  chatId: number;
  bot: Telegraf;
  userController: UserController;
  chatIdController: ChatIdController;
  logger: winston.Logger;
};
export class BaseState {
  protected _deps: StateDeps;
  constructor(deps: StateDeps) {
    this._deps = deps;
  }
}
export class Idle extends BaseState implements State {
  ask() {
    // this._deps.bot.telegram.sendMessage(this._deps.chatId, 'Выберете команду');
  }
  hanlde(text: string): State {
    // if (text!='text')
    return this;
  }
}
