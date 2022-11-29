import { ServiceIds } from '../requester/EmbassyRequester';
import { ExtendedUserData } from '../db_controllers/UserController';

export const renderUser = ({
  email,
  firstName,
  lastName,
  phone,
  ...ext
}: ExtendedUserData) =>
  `${firstName} ${lastName} 
            Телефон: ${phone}
            Email: ${email}
            ${
              ext.serviceId == ServiceIds.WORKER
                ? `Приглашение: ${ext.invitationNumber}
                Название организации: ${ext.orgName}`
                : ''
            }
            Тип визы: ${Object.entries(ServiceIds)
              .find(([_, a]) => a == ext.serviceId)
              ?.shift()} ${ext.serviceId}
            Статус: ${
              ext.isRegistered ? 'зарегистрирован на ' + ext.date : 'в очереди'
            }`.replace(/\n */g, '\n');
