import { userData } from '../const';
import { MessageController } from '../db_controllers/MessageController';
import { EmbassyWorkerCreator, ResType } from '../embassy_worker/EmbassyWorker';
import { scrapLog } from '../loggers/logger';
import { ServiceIds } from '../requester/EmbassyRequester';
import { Monitor } from './Monitor';

export class MonitorLogic {
  private _messageController: MessageController;

  constructor(messageController: MessageController) {
    this._messageController = messageController;
  }

  async run(signal: AbortSignal) {
    const mon = new Monitor();

    let registerAC = new AbortController();
    const embassyCreator = new EmbassyWorkerCreator();

    mon
      .on('switchOn', () => {
        this._messageController.addMessage(`Появились доступные даты`);
      })
      .on('switchOn', () => {
        console.log('Run registration');
        registerAC = new AbortController();
        const registrators = [userData(), userData()].map((ud) =>
          embassyCreator.createEmbassyRegister(ud)
        );
        Promise.allSettled(
          registrators.map((r, index) => {
            //return r.registerUser(ac.signal)
            return {
              date: { date: '20.04.2022', time: '21:43' },
              userData: {
                email: 'psdpsdp@gmail.com',
                firstName: 'ss' + index,
                lastName: 'hh',
                notes: 'nood',
                phone: '+998546219578',
                serviceIds: [ServiceIds.WORKER],
              },
            } as ResType;
          })
        )
          .catch((r) => console.log(r))
          .then((r) => {
            r?.map((r) => {
              if (r.status == 'fulfilled' && !!r.value) {
                const {
                  userData: { firstName, email, lastName },
                  date: { date, time },
                } = r.value;
                const message = `Зарегистрирован ${firstName} ${lastName} на ${date} в ${time}. ${email}`;

                this._messageController.addMessage(message);
              }
            });
          });
      })
      .on('switchOff', () => {
        console.log('Stop registration');
        registerAC.abort();
      })
      .on('switchOff', () => {
        this._messageController.addMessage(`Даты закончились`);
      });

    const embassy_monitor = embassyCreator.createEmbassyMonitor();
    const onAbort = () => {
      clearTimeout(timeout);
    };
    signal.addEventListener('abort', onAbort, { once: true });
    const cycleMonitor = async () => {
      try {
        if (await embassy_monitor.isPossibleToRegister()) {
          mon.setAvailable();
        } else {
          mon.setUnavailable();
        }
        timeout = setTimeout(
          cycleMonitor,
          1000 * parseInt(process.env.EMBASSY_MONITOR_INTERVAL || '60')
        );
      } catch (e) {
        scrapLog.error(e);
        timeout = setTimeout(cycleMonitor, 0);
      }
    };

    let timeout = setTimeout(cycleMonitor, 0);

    cycleMonitor();
  }
}
