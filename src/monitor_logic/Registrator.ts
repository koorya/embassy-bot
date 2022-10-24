import { MessageController } from '../db_controllers/MessageController';
import { UserController } from '../db_controllers/UserController';
import { EmbassyWorkerCreator } from '../embassy_worker/EmbassyWorker';

export class Registrator {
  private _userController: UserController;
  private _embassyCreator: EmbassyWorkerCreator;
  private _messageController: MessageController;
  constructor(
    userController: UserController,
    messageController: MessageController
  ) {
    this._userController = userController;
    this._embassyCreator = new EmbassyWorkerCreator();
    this._messageController = messageController;
  }

  async registerAll(signal: AbortSignal) {
    console.log('Run registration');
    const not_registered = await this._userController.listNotRegistered();
    const registrators = not_registered.map((ud) =>
      this._embassyCreator.createEmbassyRegister(ud)
    );
    Promise.allSettled(
      registrators.map((r) => {
        // return r.registerUser(signal)
        return r.registerUserFake(signal);
      })
    )
      .catch((r) => console.log(r))
      .then((r) => {
        r?.map(async (r) => {
          if (r.status == 'fulfilled' && !!r.value) {
            const {
              userData: { firstName, email, lastName, phone },
              date: { date, time },
            } = r.value;
            await this._userController.setRegisteredByPhone(
              phone,
              `${date} в ${time}`
            );

            const message = `Зарегистрирован ${firstName} ${lastName} на ${date} в ${time}. ${email}`;

            this._messageController.addMessage(message);
          }
        });
      });
  }
}
