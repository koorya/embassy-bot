import { ServiceIds, UserDataBase } from './requester/EmbassyRequester';

export const userData = (): UserDataBase => ({
  phone: '+998981628743',
  firstName: 'Quisque',
  lastName: 'Fermentum',
  email: 'vestibulum22@gmail.com',
  serviceId: ServiceIds.WORKER,
});
